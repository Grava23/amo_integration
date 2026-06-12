import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../../helpers/app.js"
import leadsRoutes from "../../../src/modules/leads/routes.js"

function integrationRow() {
    return {
        domain: "test.amocrm.ru",
        access_token: "access",
        refresh_token: "refresh",
        amojo_id: "amojo",
        scope_id: "scope",
        active: true,
    }
}

function contactsResponse(leads: Array<{ id: number }>) {
    return {
        _page: 1,
        _embedded: {
            contacts: [
                {
                    id: 111,
                    _embedded: { leads },
                },
            ],
        },
    }
}

describe("GET / (leads routes)", () => {
    let app: FastifyInstance
    let prisma: any
    let amoClient: any

    beforeEach(async () => {
        prisma = {
            integrations: {
                findUniqueOrThrow: vi.fn().mockResolvedValue(integrationRow()),
                update: vi.fn().mockResolvedValue(integrationRow()),
            },
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            contact: { getContacts: vi.fn() },
            leads: { getLead: vi.fn() },
            users: { getUserByID: vi.fn() },
        }
        app = buildApp({ prisma, amoClient })
        await app.register(leadsRoutes, { prefix: "/leads" })
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("200 со счастливым путём: одна открытая сделка по phone", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsResponse([{ id: 555 }]))
        amoClient.leads.getLead.mockResolvedValue({
            id: 555,
            status_id: 5,
            responsible_user_id: 42,
            custom_fields_values: [
                {
                    field_id: 1,
                    field_name: "Город",
                    field_type: "text",
                    values: [{ value: "Москва" }],
                },
            ],
        })
        amoClient.users.getUserByID.mockResolvedValue({ name: "Иван Менеджер" })

        const res = await app.inject({
            method: "GET",
            url: "/leads?domain=test.amocrm.ru&phone=79991234567",
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({
            lead_id: 555,
            closed: false,
            responsible_user_name: "Иван Менеджер",
            custom_fields: [{ name: "Город", value: "Москва" }],
        })
        expect(amoClient.contact.getContacts).toHaveBeenCalledWith(
            "test.amocrm.ru",
            "access",
            { with: ["leads"], query: "79991234567" },
        )
    })

    it("200 по username, если phone не передан", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsResponse([{ id: 555 }]))
        amoClient.leads.getLead.mockResolvedValue({
            id: 555,
            status_id: 5,
            responsible_user_id: 42,
            custom_fields_values: [],
        })
        amoClient.users.getUserByID.mockResolvedValue({ name: "Иван Менеджер" })

        const res = await app.inject({
            method: "GET",
            url: "/leads?domain=test.amocrm.ru&username=ivan_user",
        })

        expect(res.statusCode).toBe(200)
        expect(amoClient.contact.getContacts).toHaveBeenCalledWith(
            "test.amocrm.ru",
            "access",
            { with: ["leads"], query: "ivan_user" },
        )
    })

    it("204 когда у контакта нет сделок", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsResponse([]))

        const res = await app.inject({
            method: "GET",
            url: "/leads?domain=test.amocrm.ru&phone=79991234567",
        })

        expect(res.statusCode).toBe(204)
        expect(amoClient.leads.getLead).not.toHaveBeenCalled()
    })

    it("400 без phone и username", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/leads?domain=test.amocrm.ru",
        })

        expect(res.statusCode).toBe(400)
    })

    it("500 когда интеграция не найдена", async () => {
        prisma.integrations.findUniqueOrThrow.mockRejectedValue(new Error("not found"))

        const res = await app.inject({
            method: "GET",
            url: "/leads?domain=missing.amocrm.ru&phone=79991234567",
        })

        expect(res.statusCode).toBe(500)
        expect(res.json()).toMatchObject({ message: "Internal server error" })
    })
})

describe("POST /:leadId/notes (leads routes)", () => {
    let app: FastifyInstance
    let prisma: any
    let amoClient: any

    beforeEach(async () => {
        prisma = {
            integrations: {
                findUniqueOrThrow: vi.fn().mockResolvedValue(integrationRow()),
                update: vi.fn().mockResolvedValue(integrationRow()),
            },
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            notes: {
                addNotesByEntityTypeAndID: vi.fn().mockResolvedValue({
                    _embedded: { notes: [{ id: 99, entity_id: 555, request_id: "0", _links: { self: { href: "x" } } }] },
                    _links: { self: { href: "x" } },
                }),
            },
        }
        app = buildApp({ prisma, amoClient })
        await app.register(leadsRoutes, { prefix: "/leads" })
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("добавляет common-комментарий и возвращает 201", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/leads/555/notes",
            payload: { domain: "test.amocrm.ru", text: "привет от ИИ" },
        })

        expect(res.statusCode).toBe(201)
        expect(amoClient.notes.addNotesByEntityTypeAndID).toHaveBeenCalledWith(
            "test.amocrm.ru",
            "access",
            "leads",
            555,
            [{ note_type: "common", params: { text: "привет от ИИ" } }],
        )
    })

    it("400 при пустом text", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/leads/555/notes",
            payload: { domain: "test.amocrm.ru", text: "" },
        })
        expect(res.statusCode).toBe(400)
    })

    it("400 при нечисловом leadId", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/leads/abc/notes",
            payload: { domain: "test.amocrm.ru", text: "hi" },
        })
        expect(res.statusCode).toBe(400)
    })

    it("500, если интеграция не найдена", async () => {
        prisma.integrations.findUniqueOrThrow.mockRejectedValue(new Error("not found"))
        const res = await app.inject({
            method: "POST",
            url: "/leads/555/notes",
            payload: { domain: "missing.amocrm.ru", text: "hi" },
        })
        expect(res.statusCode).toBe(500)
        expect(res.json()).toMatchObject({ message: "Internal server error" })
    })
})

describe("PATCH /:leadId/stage (leads routes)", () => {
    let app: FastifyInstance
    let prisma: any
    let amoClient: any

    beforeEach(async () => {
        prisma = {
            integrations: {
                findUniqueOrThrow: vi.fn().mockResolvedValue(integrationRow()),
                update: vi.fn().mockResolvedValue(integrationRow()),
            },
            integration_settings: {
                findUnique: vi.fn().mockResolvedValue({
                    domain: "test.amocrm.ru",
                    target_status_id: 142,
                    target_pipeline_id: null,
                    target_responsible_user_id: 99,
                }),
            },
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            leads: {
                updateLead: vi.fn().mockResolvedValue({ id: 555, status_id: 142 }),
            },
        }
        app = buildApp({ prisma, amoClient })
        await app.register(leadsRoutes, { prefix: "/leads" })
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("меняет этап/ответственного и возвращает 200", async () => {
        const res = await app.inject({
            method: "PATCH",
            url: "/leads/555/stage",
            payload: { domain: "test.amocrm.ru" },
        })

        expect(res.statusCode).toBe(200)
        expect(amoClient.leads.updateLead).toHaveBeenCalledTimes(1)
        const [domain, token, leadId] = amoClient.leads.updateLead.mock.calls[0]
        expect(domain).toBe("test.amocrm.ru")
        expect(token).toBe("access")
        expect(leadId).toBe(555)
    })

    it("400 при нечисловом leadId", async () => {
        const res = await app.inject({
            method: "PATCH",
            url: "/leads/abc/stage",
            payload: { domain: "test.amocrm.ru" },
        })
        expect(res.statusCode).toBe(400)
    })

    it("400 при отсутствии domain", async () => {
        const res = await app.inject({
            method: "PATCH",
            url: "/leads/555/stage",
            payload: {},
        })
        expect(res.statusCode).toBe(400)
    })

    it("500, если интеграция не найдена", async () => {
        prisma.integrations.findUniqueOrThrow.mockRejectedValue(new Error("not found"))
        const res = await app.inject({
            method: "PATCH",
            url: "/leads/555/stage",
            payload: { domain: "missing.amocrm.ru" },
        })
        expect(res.statusCode).toBe(500)
        expect(res.json()).toMatchObject({ message: "Internal server error" })
    })
})
