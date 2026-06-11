import { FastifyPluginAsync } from "fastify";
import { wazupWebhookBodySchema } from "./schema.js";
import { handleWazupWebhookController } from "./controller.js";

const wazupRoutes: FastifyPluginAsync = async (app) => {
    app.post("/wazup",
        {
            schema:
            {
                body: wazupWebhookBodySchema
            }
        }
        , handleWazupWebhookController)
}

export default wazupRoutes;