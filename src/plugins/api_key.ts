import type { FastifyPluginAsync, FastifyRequest } from "fastify"
import fp from "fastify-plugin"
import { config } from "../config.js"

function pathnameFromUrl(url: string): string {
    const q = url.indexOf("?")
    return q === -1 ? url : url.slice(0, q)
}

function isPublicPath(path: string): boolean {
    if (path === "/health") return true
    if (path.startsWith("/webhook/")) return true
    if (path.startsWith("/api/v1/webhook/")) return true
    // amoCRM редиректит браузер сюда без нашего ключа
    if (path === "/api/v1/auth/oauth/complete") return true
    return false
}

function getProvidedKey(req: FastifyRequest): string | undefined {
    const auth = req.headers.authorization
    if (auth) {
        const m = auth.match(/^Bearer\s+(.+)$/i)
        const v = m?.[1]?.trim()
        if (v) return v
    }
    const x = req.headers["x-api-key"]
    if (typeof x === "string") {
        const v = x.trim()
        if (v) return v
    }
    if (Array.isArray(x)) {
        const v = x[0]?.trim()
        if (v) return v
    }
    return undefined
}

/** Если задан SERVER_API_KEY — все маршруты, кроме health / oauth/complete / вебхуков Amo, требуют ключ. */
const apiKeyPluginImpl: FastifyPluginAsync = async (app) => {
    app.addHook("onRequest", async (req, reply) => {
        const expected = config.SERVER_API_KEY
        if (expected === undefined || expected === "") return

        const path = pathnameFromUrl(req.url)
        if (isPublicPath(path)) return

        const provided = getProvidedKey(req)
        if (provided !== expected) {
            return reply.status(401).send({ error: "Unauthorized" })
        }
    })
}

export default fp(apiKeyPluginImpl, { name: "api-key" })
