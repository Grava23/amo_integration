import { describe, it, expect, beforeEach, afterEach } from "vitest"
import type { FastifyInstance } from "fastify"
import { init } from "../src/app.js"

describe("app init()", () => {
    let app: FastifyInstance

    beforeEach(async () => {
        app = await init()
        app.post("/echo", async (req) => req.body)
        await app.ready()
    })
    afterEach(async () => {
        await app.close()
    })

    it("парсит application/x-www-form-urlencoded через qs.parse", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/echo",
            payload: "a=1&b=2",
            headers: { "content-type": "application/x-www-form-urlencoded" },
        })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ a: "1", b: "2" })
    })
})
