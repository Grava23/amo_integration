import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../../helpers/app.js"
import wazupRoutes from "../../../src/modules/wazup/routes.js"

const MESSAGE_ID = "550e8400-e29b-41d4-a716-446655440000"
const CHANNEL_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8"

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

function validMessage(overrides: Record<string, unknown> = {}) {
    return {
        messageId: MESSAGE_ID,
        channelId: CHANNEL_ID,
        chatType: "whatsapp",
        chatId: "79991234567",
        dateTime: "2026-06-09T10:00:00Z",
        type: "text",
        isEcho: false,
        status: "inbound",
        text: "привет",
        ...overrides,
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

describe("POST /wazup (wazup routes)", () => {
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
        await app.register(wazupRoutes, { prefix: "/webhook" })
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("200 со счастливым путём: одна открытая сделка", async () => {
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
            method: "POST",
            url: "/webhook/wazup",
            payload: { domain: "test.amocrm.ru", messages: [validMessage()] },
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

    it("204 когда у контакта нет сделок", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsResponse([]))

        const res = await app.inject({
            method: "POST",
            url: "/webhook/wazup",
            payload: { domain: "test.amocrm.ru", messages: [validMessage()] },
        })

        expect(res.statusCode).toBe(204)
        expect(amoClient.leads.getLead).not.toHaveBeenCalled()
    })

    it("500 когда интеграция не найдена", async () => {
        prisma.integrations.findUniqueOrThrow.mockRejectedValue(new Error("not found"))

        const res = await app.inject({
            method: "POST",
            url: "/webhook/wazup",
            payload: { domain: "missing.amocrm.ru", messages: [validMessage()] },
        })

        expect(res.statusCode).toBe(500)
        expect(res.json()).toMatchObject({ message: "Internal server error" })
    })

    it("400 при невалидном теле (messages не массив)", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/webhook/wazup",
            payload: { domain: "test.amocrm.ru", messages: "nope" },
        })

        expect(res.statusCode).toBe(400)
    })

    it("400 при невалидном chatType", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/webhook/wazup",
            payload: {
                domain: "test.amocrm.ru",
                messages: [validMessage({ chatType: "carrierpigeon" })],
            },
        })

        expect(res.statusCode).toBe(400)
    })
})
