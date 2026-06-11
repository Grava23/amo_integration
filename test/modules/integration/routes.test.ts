import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../../helpers/app.js"
import integrationRoutes from "../../../src/modules/integration/routes.js"

describe("PATCH /:domain/active (integration routes)", () => {
    let app: FastifyInstance
    let prisma: any

    beforeEach(async () => {
        prisma = {
            integrations: {
                update: vi.fn().mockResolvedValue({ domain: "test.amocrm.ru", active: true }),
            },
        }
        app = buildApp({ prisma, amoClient: { auth: { refreshToken: vi.fn() } } })
        await app.register(integrationRoutes, { prefix: "/integration" })
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("200 при валидном теле {active:true} и вызывает update", async () => {
        const res = await app.inject({
            method: "PATCH",
            url: "/integration/test.amocrm.ru/active",
            payload: { active: true },
        })

        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ message: "Integration active updated" })
        expect(prisma.integrations.update).toHaveBeenCalledWith({
            where: { domain: "test.amocrm.ru", deleted_at: null },
            data: { active: true },
        })
    })

    it("400 при невалидном теле (active не boolean)", async () => {
        const res = await app.inject({
            method: "PATCH",
            url: "/integration/test.amocrm.ru/active",
            payload: { active: "yes" },
        })

        expect(res.statusCode).toBe(400)
        expect(prisma.integrations.update).not.toHaveBeenCalled()
    })

    it("500 когда repo.update reject (контроллер бросает, дефолтный error-handler)", async () => {
        prisma.integrations.update.mockRejectedValue(new Error("db down"))

        const res = await app.inject({
            method: "PATCH",
            url: "/integration/test.amocrm.ru/active",
            payload: { active: false },
        })

        expect(res.statusCode).toBe(500)
    })
})

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

describe("integration settings + dropdowns routes", () => {
    let app: FastifyInstance
    let prisma: any
    let amoClient: any

    beforeEach(async () => {
        prisma = {
            integrations: {
                findMany: vi.fn().mockResolvedValue([{ domain: "test.amocrm.ru", active: true }]),
                findUniqueOrThrow: vi.fn().mockResolvedValue(integrationRow()),
                update: vi.fn().mockResolvedValue(integrationRow()),
            },
            integration_settings: {
                findUnique: vi.fn().mockResolvedValue(null),
                upsert: vi.fn().mockImplementation(({ create, update }: any) => ({
                    domain: "test.amocrm.ru",
                    target_status_id: (create ?? update).target_status_id ?? null,
                    target_pipeline_id: (create ?? update).target_pipeline_id ?? null,
                    target_responsible_user_id: (create ?? update).target_responsible_user_id ?? null,
                })),
            },
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            leads: {
                getPipelines: vi.fn().mockResolvedValue({
                    _embedded: {
                        pipelines: [
                            { id: 1, name: "Воронка", sort: 1, is_main: true, _embedded: { statuses: [{ id: 142, name: "Успех", sort: 1, pipeline_id: 1 }] } },
                        ],
                    },
                }),
            },
            users: {
                getUsers: vi.fn().mockResolvedValue({
                    _embedded: { users: [{ id: 7, name: "Иван", email: "ivan@x.ru" }] },
                }),
            },
        }
        app = buildApp({ prisma, amoClient })
        await app.register(integrationRoutes, { prefix: "/integration" })
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("GET / возвращает список интеграций", async () => {
        const res = await app.inject({ method: "GET", url: "/integration" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ integrations: [{ domain: "test.amocrm.ru", active: true }] })
    })

    it("GET /:domain/lead-stage-settings отдаёт null-настройки, если их нет", async () => {
        const res = await app.inject({ method: "GET", url: "/integration/test.amocrm.ru/lead-stage-settings" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({
            domain: "test.amocrm.ru",
            status_id: null,
            pipeline_id: null,
            responsible_user_id: null,
        })
    })

    it("PUT /:domain/lead-stage-settings апсертит и возвращает настройки", async () => {
        const res = await app.inject({
            method: "PUT",
            url: "/integration/test.amocrm.ru/lead-stage-settings",
            payload: { status_id: 142, pipeline_id: 1, responsible_user_id: 7 },
        })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({
            domain: "test.amocrm.ru",
            status_id: 142,
            pipeline_id: 1,
            responsible_user_id: 7,
        })
        expect(prisma.integration_settings.upsert).toHaveBeenCalledWith({
            where: { domain: "test.amocrm.ru" },
            create: { domain: "test.amocrm.ru", target_status_id: 142, target_pipeline_id: 1, target_responsible_user_id: 7 },
            update: { target_status_id: 142, target_pipeline_id: 1, target_responsible_user_id: 7 },
        })
    })

    it("PUT принимает пустое тело (очистка) — все поля null", async () => {
        const res = await app.inject({
            method: "PUT",
            url: "/integration/test.amocrm.ru/lead-stage-settings",
            payload: {},
        })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({ status_id: null, pipeline_id: null, responsible_user_id: null })
    })

    it("PUT 400 при отрицательном status_id", async () => {
        const res = await app.inject({
            method: "PUT",
            url: "/integration/test.amocrm.ru/lead-stage-settings",
            payload: { status_id: -5 },
        })
        expect(res.statusCode).toBe(400)
    })

    it("GET /:domain/pipelines отдаёт слим-список воронок с этапами", async () => {
        const res = await app.inject({ method: "GET", url: "/integration/test.amocrm.ru/pipelines" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({
            pipelines: [{ id: 1, name: "Воронка", statuses: [{ id: 142, name: "Успех" }] }],
        })
    })

    it("GET /:domain/users отдаёт слим-список пользователей", async () => {
        const res = await app.inject({ method: "GET", url: "/integration/test.amocrm.ru/users" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ users: [{ id: 7, name: "Иван", email: "ivan@x.ru" }] })
    })

    it("GET /:domain/pipelines 500, если интеграция не найдена", async () => {
        prisma.integrations.findUniqueOrThrow.mockRejectedValue(new Error("not found"))
        const res = await app.inject({ method: "GET", url: "/integration/missing.amocrm.ru/pipelines" })
        expect(res.statusCode).toBe(500)
        expect(res.json()).toMatchObject({ message: "Internal server error" })
    })
})
