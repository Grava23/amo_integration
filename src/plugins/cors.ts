import cors from "@fastify/cors"
import type { FastifyPluginAsync } from "fastify"
import fp from "fastify-plugin"
import { config } from "../config.js"

const corsPluginImpl: FastifyPluginAsync = async (app) => {
    const origins = config.FRONTEND_ORIGIN.split(",")
        .map((s) => s.trim())
        .filter(Boolean)

    await app.register(cors, {
        origin: origins.length > 0 ? origins : false,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-api-key"],
    })
}

export default fp(corsPluginImpl, { name: "cors" })
