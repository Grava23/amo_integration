import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { vi } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../helpers/app.js"

async function buildWithRoutes(plugin: any): Promise<FastifyInstance> {
    const app = buildApp()
    await app.register(plugin)
    app.get("/health", async () => ({ ok: true }))
    app.get("/api/v1/webhook/wazup", async () => ({ ok: true }))
    app.get("/api/v1/auth/oauth/complete", async () => ({ ok: true }))
    app.get("/protected", async () => ({ ok: true }))
    await app.ready()
    return app
}

describe("api_key plugin", () => {
    afterEach(() => {
        delete process.env.SERVER_API_KEY
        vi.resetModules()
    })

    describe("без SERVER_API_KEY (config undefined)", () => {
        let app: FastifyInstance

        beforeEach(async () => {
            const plugin = (await import("../../src/plugins/api_key.js")).default
            app = await buildWithRoutes(plugin)
        })
        afterEach(async () => {
            await app.close()
        })

        it("все маршруты проходят без ключа, включая /protected", async () => {
            for (const url of ["/health", "/api/v1/webhook/wazup", "/api/v1/auth/oauth/complete", "/protected"]) {
                const res = await app.inject({ method: "GET", url })
                expect(res.statusCode).toBe(200)
            }
        })
    })

    describe("с заданным SERVER_API_KEY", () => {
        let app: FastifyInstance

        beforeEach(async () => {
            vi.resetModules()
            process.env.SERVER_API_KEY = "secret"
            const plugin = (await import("../../src/plugins/api_key.js")).default
            app = await buildWithRoutes(plugin)
        })
        afterEach(async () => {
            await app.close()
        })

        it("публичные пути проходят без ключа", async () => {
            for (const url of ["/health", "/api/v1/webhook/wazup", "/api/v1/auth/oauth/complete"]) {
                const res = await app.inject({ method: "GET", url })
                expect(res.statusCode).toBe(200)
            }
        })

        it("/protected без ключа → 401", async () => {
            const res = await app.inject({ method: "GET", url: "/protected" })
            expect(res.statusCode).toBe(401)
            expect(res.json()).toMatchObject({ error: "Unauthorized" })
        })

        it("/protected с Authorization: Bearer secret → 200", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/protected",
                headers: { authorization: "Bearer secret" },
            })
            expect(res.statusCode).toBe(200)
        })

        it("/protected с x-api-key: secret → 200", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/protected",
                headers: { "x-api-key": "secret" },
            })
            expect(res.statusCode).toBe(200)
        })

        it("/protected с неверным ключом → 401", async () => {
            const res = await app.inject({
                method: "GET",
                url: "/protected",
                headers: { authorization: "Bearer wrong" },
            })
            expect(res.statusCode).toBe(401)
        })
    })
})
