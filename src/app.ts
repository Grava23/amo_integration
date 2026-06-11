import Fastify from "fastify"
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"
import qs from "qs"
import { config } from "./config.js"
import { logger } from "./logger.js"
import prismaPlugin from "./plugins/prisma.js"
import amoPlugin from "./plugins/amo.js"
import apiKeyPlugin from "./plugins/api_key.js"
import corsPlugin from "./plugins/cors.js"
import authRoutes from "./modules/auth/routes.js"
import integrationRoutes from "./modules/integration/routes.js"
import wazupRoutes from "./modules/wazup/routes.js"
import leadsRoutes from "./modules/leads/routes.js"

export async function init() {
    const app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    app.addContentTypeParser(
        "application/x-www-form-urlencoded",
        { parseAs: "string" },
        (_req, body, done) => {
            done(null, qs.parse(body as string))
        },
    )

    return app
}

/**
 * Собирает полностью настроенное приложение (плагины, хуки, error-handler, роуты),
 * но НЕ слушает порт. Вынесено из run() для тестируемости.
 */
export async function buildServer() {
    const app = await init()

    await app.register(prismaPlugin)
    await app.register(amoPlugin)
    await app.register(corsPlugin)
    await app.register(apiKeyPlugin)

    app.setErrorHandler((error, req, reply) => {
        // Логируем тело запроса для 400 (обычно это validation errors),
        // чтобы проще было дебажить неожиданные payload'ы от вебхуков/клиентов.
        if ((reply as any).statusCode === 400 || (error as any)?.statusCode === 400) {
            logger.warn("Request failed with 400", {
                method: req.method,
                url: req.url,
                errorMessage: (error as Error)?.message,
                body: (req as any).body,
            })
        }

        reply.send(error)
    })

    app.addHook("onRequest", async (req, reply) => {
        ; (req as any).startTime = Date.now()
        logger.info(`Incoming request`, { method: req.method, url: req.url, ip: req.ip })
    })

    app.addHook("onResponse", async (req, reply) => {
        const duration = Date.now() - (req as any).startTime
        logger.info(`Request completed`, { method: req.method, url: req.url, status: reply.statusCode, duration })
    })

    app.get("/health", async () => {
        return { status: "ok" }
    })

    await app.register(async (v1) => {
        await v1.register(authRoutes, { prefix: "/auth" })
        await v1.register(integrationRoutes, { prefix: "/integration" })
        await v1.register(wazupRoutes, { prefix: "/webhook" })
        await v1.register(leadsRoutes, { prefix: "/leads" })
    }, { prefix: "/api/v1" })

    return app
}

export async function run() {
    const app = await buildServer()

    await app.listen({
        port: config.PORT,
        host: config.HOST
    })

    logger.info(`🚀 server started`, { host: config.HOST, port: config.PORT })

    const shutdown = async () => {
        await app.close()
        logger.info(`🛑 server stopped by signal`)
        process.exit(0)
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)
}