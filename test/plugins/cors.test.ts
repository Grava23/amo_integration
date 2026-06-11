import { describe, it, expect, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { buildApp } from "../helpers/app.js"
import corsPlugin from "../../src/plugins/cors.js"

describe("cors plugin", () => {
    let app: FastifyInstance

    beforeEach(async () => {
        app = buildApp()
        await app.register(corsPlugin)
        app.get("/x", async () => ({ ok: true }))
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("preflight OPTIONS отражает разрешённый origin", async () => {
        const res = await app.inject({
            method: "OPTIONS",
            url: "/x",
            headers: {
                origin: "http://localhost:5173",
                "access-control-request-method": "GET",
            },
        })
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173")
    })

    it("обычный GET с разрешённым origin отражает его", async () => {
        const res = await app.inject({
            method: "GET",
            url: "/x",
            headers: { origin: "http://localhost:5173" },
        })
        expect(res.statusCode).toBe(200)
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173")
    })
})
