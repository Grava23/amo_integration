import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../../helpers/app.js"
import authRoutes from "../../../src/modules/auth/routes.js"

const NAV = { "sec-fetch-mode": "navigate", accept: "text/html" }

describe("auth controller — браузерная навигация и ошибки", () => {
    let app: FastifyInstance
    let prisma: any
    let amoClient: any

    beforeEach(async () => {
        prisma = {
            oauth_states: {
                create: vi.fn().mockResolvedValue({}),
                update: vi.fn().mockResolvedValue({}),
            },
            integrations: {
                findUniqueOrThrow: vi.fn().mockResolvedValue({
                    domain: "acme.amocrm.ru",
                    access_token: "a",
                    refresh_token: "r",
                    amojo_id: "am",
                    scope_id: "sc",
                    active: true,
                }),
                upsert: vi.fn().mockResolvedValue({}),
                update: vi.fn().mockResolvedValue({}),
            },
        }
        amoClient = {
            auth: {
                getAccessToken: vi.fn().mockResolvedValue({ access_token: "a", refresh_token: "r", token_type: "Bearer", expires_in: 1 }),
                refreshToken: vi.fn(),
            },
            account: { getAmojoID: vi.fn().mockResolvedValue("amojo") },
        }
        app = buildApp({ prisma, amoClient })
        await app.register(authRoutes, { prefix: "/auth" })
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("complete с error при навигации → 302 редирект на фронт", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/auth/oauth/complete?error=access_denied",
            headers: NAV,
        })
        expect(res.statusCode).toBe(302)
        expect(res.headers.location).toContain("/oauth/callback/")
        expect(res.headers.location).toContain("error=access_denied")
    })

    it("complete без state/code при навигации → 302 с missing_params", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/auth/oauth/complete",
            headers: NAV,
        })
        expect(res.statusCode).toBe(302)
        expect(res.headers.location).toContain("missing_params")
    })

    it("complete валидный при навигации → 302 pending", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/auth/oauth/complete?state=s1&code=c1&referer=acme.amocrm.ru",
            headers: NAV,
        })
        expect(res.statusCode).toBe(302)
        expect(res.headers.location).toContain("pending=1")
    })

    it("start → 500, если создание oauth-state упало", async () => {
        prisma.oauth_states.create.mockRejectedValue(new Error("db down"))
        const res = await app.inject({
            method: "GET",
            url: "/auth/oauth/start",
            headers: { accept: "application/json" },
        })
        expect(res.statusCode).toBe(500)
    })
})
