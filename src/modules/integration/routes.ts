import type { FastifyPluginAsync } from "fastify"
import {
    updateIntegrationActiveController,
    listIntegrationsController,
    getLeadStageSettingsController,
    putLeadStageSettingsController,
    getPipelinesController,
    getUsersController,
} from "./controller.js";
import {
    updateIntegrationActiveParamsSchema,
    updateIntegrationActiveRequestSchema,
    integrationDomainParamsSchema,
    leadStageSettingsBodySchema,
} from "./schema.js";

const integrationRoutes: FastifyPluginAsync = async (app) => {
    app.get("/", listIntegrationsController)

    app.patch("/:domain/active",
        {
            schema:
            {
                params: updateIntegrationActiveParamsSchema, body: updateIntegrationActiveRequestSchema
            }
        },
        updateIntegrationActiveController
    )

    app.get("/:domain/lead-stage-settings",
        { schema: { params: integrationDomainParamsSchema } },
        getLeadStageSettingsController
    )

    app.put("/:domain/lead-stage-settings",
        { schema: { params: integrationDomainParamsSchema, body: leadStageSettingsBodySchema } },
        putLeadStageSettingsController
    )

    app.get("/:domain/pipelines",
        { schema: { params: integrationDomainParamsSchema } },
        getPipelinesController
    )

    app.get("/:domain/users",
        { schema: { params: integrationDomainParamsSchema } },
        getUsersController
    )
}

export default integrationRoutes