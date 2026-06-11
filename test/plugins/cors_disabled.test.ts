import { describe, it, expect, afterEach, vi } from "vitest"
import Fastify, { type FastifyInstance } from "fastify"

describe("cors plugin — пустой FRONTEND_ORIGIN", () => {
    let app: FastifyInstance
    const prev = process.env.FRONTEND_ORIGIN

    afterEach(async () => {
        await app?.close()
        process.env.FRONTEND_ORIGIN = prev
        vi.resetModules()
    })

    it("при пустом списке origins CORS отключён (origin: false)", async () => {
        process.env.FRONTEND_ORIGIN = "   " // только пробелы → после trim/filter список пуст
        vi.resetModules()
        const { default: corsPlugin } = await import("../../src/plugins/cors.js")

        app = Fastify()
        await app.register(corsPlugin)
        app.get("/x", async () => ({ ok: true }))
        await app.ready()

        const res = await app.inject({
            method: "GET",
            url: "/x",
            headers: { origin: "http://evil.example.com" },
        })
        // CORS отключён → заголовок allow-origin не выставляется
        expect(res.headers["access-control-allow-origin"]).toBeUndefined()
        expect(res.statusCode).toBe(200)
    })
})
