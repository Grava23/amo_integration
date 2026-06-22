import type { FastifyPluginAsync } from "fastify"
import {
    updateIntegrationActiveController,
    disconnectIntegrationController,
    listIntegrationsController,
    getLeadStageSettingsController,
    putLeadStageSettingsController,
    getPipelinesController,
    getUsersController,
    getHealthController,
    getActivityController,
    setAmoTokenController,
} from "./controller.js";
import {
    updateIntegrationActiveParamsSchema,
    updateIntegrationActiveRequestSchema,
    integrationDomainParamsSchema,
    leadStageSettingsBodySchema,
    amoTokenBodySchema,
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

    app.delete("/:domain",
        { schema: { params: integrationDomainParamsSchema } },
        disconnectIntegrationController
    )

    app.get("/:domain/lead-stage-settings",
        { schema: { params: integrationDomainParamsSchema } },
        getLeadStageSettingsController
    )

    app.put("/:domain/lead-stage-settings",
        { schema: { params: integrationDomainParamsSchema, body: leadStageSettingsBodySchema } },
        putLeadStageSettingsController
    )

    app.put("/:domain/amo-token",
        { schema: { params: integrationDomainParamsSchema, body: amoTokenBodySchema } },
        setAmoTokenController
    )

    app.get("/:domain/pipelines",
        { schema: { params: integrationDomainParamsSchema } },
        getPipelinesController
    )

    app.get("/:domain/users",
        { schema: { params: integrationDomainParamsSchema } },
        getUsersController
    )

    app.get("/:domain/health",
        { schema: { params: integrationDomainParamsSchema } },
        getHealthController
    )

    app.get("/:domain/activity",
        { schema: { params: integrationDomainParamsSchema } },
        getActivityController
    )
}

export default integrationRoutes