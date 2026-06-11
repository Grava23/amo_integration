import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import type { FastifyPluginAsync } from "fastify"
import fp from "fastify-plugin"
import { PrismaClient } from "../generated/prisma/client.js"
import { logger } from "../logger.js"

const prismaPluginImpl: FastifyPluginAsync = async (app) => {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set")
    }
    const adapter = new PrismaPg({ connectionString })
    const prisma = new PrismaClient({ adapter })
    await prisma.$connect()

    // Реально проверяем подключение — с адаптером $connect() может не открывать соединение до первого запроса
    await prisma.$queryRaw`SELECT 1`
    logger.info("🔌 Prisma connected")

    app.decorate("prisma", prisma)

    // отключаемся при завершении приложения
    app.addHook("onClose", async (app) => {
        await prisma.$disconnect()
        logger.info("🔌 Prisma disconnected")
    })
}

export default fp(prismaPluginImpl, { name: "prisma" })