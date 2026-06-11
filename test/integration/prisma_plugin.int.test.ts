import { describe, it, expect, inject } from "vitest"
import Fastify from "fastify"
import prismaPlugin from "../../src/plugins/prisma.js"

describe("prisma plugin (real DB)", () => {
    it("декорирует prisma и реально коннектится", async () => {
        process.env.DATABASE_URL = inject("databaseUrl")
        const app = Fastify()
        await app.register(prismaPlugin)
        await app.ready()

        const rows = await app.prisma.$queryRaw`SELECT 1 as one`
        expect(rows).toBeTruthy()

        await app.close()
    })

    it("бросает, если DATABASE_URL не задан", async () => {
        const prev = process.env.DATABASE_URL
        delete process.env.DATABASE_URL

        const app = Fastify()
        app.register(prismaPlugin)
        await expect(app.ready()).rejects.toThrow("DATABASE_URL is not set")

        process.env.DATABASE_URL = prev
        await app.close()
    })
})
