import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../../helpers/app.js"
import authRoutes from "../../../src/modules/auth/routes.js"

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

describe("auth routes", () => {
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
                findUniqueOrThrow: vi.fn().mockResolvedValue(integrationRow()),
                upsert: vi.fn().mockResolvedValue(integrationRow()),
                update: vi.fn().mockResolvedValue(integrationRow()),
            },
        }
        amoClient = {
            auth: {
                refreshToken: vi.fn(),
                getAccessToken: vi.fn().mockResolvedValue({
                    access_token: "new-access",
                    refresh_token: "new-refresh",
                }),
            },
            account: { getAmojoID: vi.fn().mockResolvedValue("amojo-id") },
        }
        app = buildApp({ prisma, amoClient })
        await app.register(authRoutes, { prefix: "/auth" })
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    describe("GET /oauth/start", () => {
        it("200 с {authorizeUrl} при Accept: application/json", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/auth/oauth/start",
                headers: { accept: "application/json" },
            })

            expect(res.statusCode).toBe(200)
            expect(res.json()).toHaveProperty("authorizeUrl")
            expect(res.json().authorizeUrl).toContain("client_id=")
            expect(prisma.oauth_states.create).toHaveBeenCalled()
        })

        it("302 redirect на authorizeUrl без Accept json (text/html)", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/auth/oauth/start",
                headers: { accept: "text/html" },
            })

            expect(res.statusCode).toBe(302)
            expect(res.headers.location).toContain("client_id=")
        })
    })

    describe("GET /oauth/complete", () => {
        it("403 при error=access_denied и accept json", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/auth/oauth/complete?error=access_denied",
                headers: { accept: "application/json" },
            })

            expect(res.statusCode).toBe(403)
            expect(res.json()).toMatchObject({ error: "access_denied" })
        })

        it("400 при отсутствии state/code (accept json)", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/auth/oauth/complete",
                headers: { accept: "application/json" },
            })

            expect(res.statusCode).toBe(400)
        })

        it("202 при валидных state+code+referer (accept json)", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/auth/oauth/complete?state=abc&code=xyz&referer=https://test.amocrm.ru",
                headers: { accept: "application/json" },
            })

            expect(res.statusCode).toBe(202)
            expect(res.json()).toMatchObject({ message: "Accepted" })
        })
    })
})
