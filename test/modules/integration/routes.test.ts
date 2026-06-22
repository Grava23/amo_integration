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
                upsert: vi.fn().mockImplementation(({ create, update }: any) => {
                    const d = create ?? update
                    return {
                        domain: "test.amocrm.ru",
                        target_status_id: d.target_status_id ?? null,
                        target_pipeline_id: d.target_pipeline_id ?? null,
                        target_responsible_user_id: d.target_responsible_user_id ?? null,
                        priority_open_status_id: d.priority_open_status_id ?? null,
                        comment_template: d.comment_template ?? null,
                        ai_pipeline_id: d.ai_pipeline_id ?? null,
                        ai_trigger_status_id: d.ai_trigger_status_id ?? null,
                        ai_responsible_user_id: d.ai_responsible_user_id ?? null,
                        ai_start_time_field_id: d.ai_start_time_field_id ?? null,
                        autoblock_status_id: d.autoblock_status_id ?? null,
                        handoff_status_id: d.handoff_status_id ?? null,
                        success_status_id: d.success_status_id ?? null,
                    }
                }),
            },
            lead_stage_events: {
                findMany: vi.fn().mockResolvedValue([
                    {
                        id: 5, domain: "test.amocrm.ru", source: "manual", lead_id: 555,
                        status_id: 142, pipeline_id: null, responsible_user_id: 7,
                        success: true, error: null, created_at: new Date("2026-06-11T10:00:00.000Z"),
                    },
                ]),
            },
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            account: { getAmojoID: vi.fn().mockResolvedValue("amojo-123") },
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
            priority_open_status_id: null,
            comment_template: null,
            ai_pipeline_id: null,
            ai_trigger_status_id: null,
            ai_responsible_user_id: null,
            ai_start_time_field_id: null,
            autoblock_status_id: null,
            handoff_status_id: null,
            success_status_id: null,
        })
    })

    it("PUT /:domain/lead-stage-settings апсертит и возвращает настройки", async () => {
        const res = await app.inject({
            method: "PUT",
            url: "/integration/test.amocrm.ru/lead-stage-settings",
            payload: { status_id: 142, pipeline_id: 1, responsible_user_id: 7, priority_open_status_id: 9, comment_template: "привет" },
        })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({
            domain: "test.amocrm.ru",
            status_id: 142,
            pipeline_id: 1,
            responsible_user_id: 7,
            priority_open_status_id: 9,
            comment_template: "привет",
            ai_pipeline_id: null,
            ai_trigger_status_id: null,
            ai_responsible_user_id: null,
            ai_start_time_field_id: null,
            autoblock_status_id: null,
            handoff_status_id: null,
            success_status_id: null,
        })
        const aiNulls = {
            ai_pipeline_id: null, ai_trigger_status_id: null, ai_responsible_user_id: null,
            ai_start_time_field_id: null, autoblock_status_id: null, handoff_status_id: null, success_status_id: null,
        }
        expect(prisma.integration_settings.upsert).toHaveBeenCalledWith({
            where: { domain: "test.amocrm.ru" },
            create: { domain: "test.amocrm.ru", target_status_id: 142, target_pipeline_id: 1, target_responsible_user_id: 7, priority_open_status_id: 9, comment_template: "привет", ...aiNulls },
            update: { target_status_id: 142, target_pipeline_id: 1, target_responsible_user_id: 7, priority_open_status_id: 9, comment_template: "привет", ...aiNulls },
        })
    })

    it("PUT принимает пустое тело (очистка) — все поля null", async () => {
        const res = await app.inject({
            method: "PUT",
            url: "/integration/test.amocrm.ru/lead-stage-settings",
            payload: {},
        })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toMatchObject({
            status_id: null, pipeline_id: null, responsible_user_id: null,
            priority_open_status_id: null, comment_template: null,
        })
    })

    it("PUT 400 при отрицательном status_id", async () => {
        const res = await app.inject({
            method: "PUT",
            url: "/integration/test.amocrm.ru/lead-stage-settings",
            payload: { status_id: -5 },
        })
        expect(res.statusCode).toBe(400)
    })

    it("PUT 400 при пустом comment_template", async () => {
        const res = await app.inject({
            method: "PUT",
            url: "/integration/test.amocrm.ru/lead-stage-settings",
            payload: { comment_template: "   " },
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

    it("GET /:domain/health возвращает ok при успешном вызове amo", async () => {
        const res = await app.inject({ method: "GET", url: "/integration/test.amocrm.ru/health" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ ok: true, amojoId: "amojo-123" })
    })

    it("GET /:domain/health возвращает ok:false, если amo упал", async () => {
        amoClient.account.getAmojoID.mockRejectedValue(new Error("HTTP 500: boom"))
        const res = await app.inject({ method: "GET", url: "/integration/test.amocrm.ru/health" })
        expect(res.statusCode).toBe(200)
        const body = res.json()
        expect(body.ok).toBe(false)
        expect(body.error).toContain("boom")
    })

    it("GET /:domain/activity возвращает события журнала", async () => {
        const res = await app.inject({ method: "GET", url: "/integration/test.amocrm.ru/activity" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({
            events: [
                {
                    id: 5, source: "manual", lead_id: 555, status_id: 142, pipeline_id: null,
                    responsible_user_id: 7, success: true, error: null,
                    created_at: "2026-06-11T10:00:00.000Z",
                },
            ],
        })
    })

    it("DELETE /:domain мягко отключает интеграцию", async () => {
        const res = await app.inject({ method: "DELETE", url: "/integration/test.amocrm.ru" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ message: "Integration disconnected" })
        expect(prisma.integrations.update).toHaveBeenCalledWith({
            where: { domain: "test.amocrm.ru", deleted_at: null },
            data: expect.objectContaining({ deleted_at: expect.any(Date), active: false }),
        })
    })

    it("DELETE /:domain 500, если интеграция не найдена", async () => {
        prisma.integrations.update.mockRejectedValue(new Error("P2025"))
        const res = await app.inject({ method: "DELETE", url: "/integration/missing.amocrm.ru" })
        expect(res.statusCode).toBe(500)
    })
})
