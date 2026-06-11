import type { FastifyPluginAsync } from "fastify"
import { startOauthController, completeOauthController } from "./controller.js"
import { completeOauthQuerySchema } from "./schema.js"

const authRoutes: FastifyPluginAsync = async (app) => {
    app.get("/oauth/start", startOauthController)
    app.get("/oauth/complete",
        {
            schema:
            {
                querystring: completeOauthQuerySchema
            }
        },
        completeOauthController
    )
}

export default authRoutes