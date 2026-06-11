import type { FastifyPluginAsync } from "fastify"
import fp from "fastify-plugin"
import { AmoClient } from "../infra/amo/client.js"
import { config } from "../config.js"

const amoPluginImpl: FastifyPluginAsync = async (app) => {
    const amoClient = new AmoClient(
        config.AMO_CLIENT_RETRY_ATTEMPTS,
        config.AMO_CLIENT_BASE_DELAY_MS,
        config.AMO_CLIENT_RPS
    )

    app.decorate("amoClient", amoClient)
}

export default fp(amoPluginImpl, { name: "amo" })