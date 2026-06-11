import { describe, it, expect, beforeAll, afterAll, inject } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildServer } from "../../src/app.js"

let app: FastifyInstance

beforeAll(async () => {
    process.env.DATABASE_URL = inject("databaseUrl")
    app = await buildServer()
    await app.ready()
})

afterAll(async () => {
    await app?.close()
})

describe("buildServer (полный стек на реальной БД)", () => {
    it("GET /health → {status:'ok'}", async () => {
        const res = await app.inject({ method: "GET", url: "/health" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ status: "ok" })
    })

    it("неизвестный роут → 404", async () => {
        const res = await app.inject({ method: "GET", url: "/api/v1/nope" })
        expect(res.statusCode).toBe(404)
    })

    it("невалидное тело → 400 (срабатывает error-handler с логом)", async () => {
        const res = await app.inject({
            method: "PATCH",
            url: "/api/v1/integration/acme.amocrm.ru/active",
            payload: { active: "not-a-bool" },
        })
        expect(res.statusCode).toBe(400)
    })

    it("маршруты примонтированы под /api/v1 (leads валидирует тело)", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/v1/leads/123/notes",
            payload: { domain: "acme.amocrm.ru", text: "" },
        })
        expect(res.statusCode).toBe(400)
    })

    it("вебхук wazup публичный (без API-ключа доступен, валидирует тело)", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/v1/webhook/wazup",
            payload: { domain: "acme.amocrm.ru", messages: "not-an-array" },
        })
        // 400 (валидация), а НЕ 401 — значит публичный путь пропустил без ключа
        expect(res.statusCode).toBe(400)
    })

    it("PATCH integration/active реально обновляет запись в БД через полный стек", async () => {
        // подготовим интеграцию напрямую через prisma, декорированный в app
        await (app as any).prisma.integrations.deleteMany({ where: { domain: "e2e.amocrm.ru" } })
        await (app as any).prisma.integrations.create({
            data: {
                domain: "e2e.amocrm.ru",
                access_token: "a",
                refresh_token: "r",
                amojo_id: "am",
                scope_id: "sc",
                active: true,
            },
        })

        const res = await app.inject({
            method: "PATCH",
            url: "/api/v1/integration/e2e.amocrm.ru/active",
            payload: { active: false },
        })
        expect(res.statusCode).toBe(200)

        const row = await (app as any).prisma.integrations.findUniqueOrThrow({ where: { domain: "e2e.amocrm.ru" } })
        expect(row.active).toBe(false)
    })
})
