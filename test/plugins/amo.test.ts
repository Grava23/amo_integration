import { describe, it, expect, afterEach } from "vitest"
import Fastify, { type FastifyInstance } from "fastify"
import amoPlugin from "../../src/plugins/amo.js"
import { AmoClient } from "../../src/infra/amo/client.js"

describe("amo plugin", () => {
    let app: FastifyInstance
    afterEach(async () => {
        await app?.close()
    })

    it("декорирует app.amoClient экземпляром AmoClient", async () => {
        app = Fastify()
        await app.register(amoPlugin)
        await app.ready()

        expect(app.amoClient).toBeInstanceOf(AmoClient)
    })
})
