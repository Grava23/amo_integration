import { FastifyPluginAsync } from "fastify";
import { addLeadCommentParamsSchema, addLeadCommentBodySchema, changeLeadStageParamsSchema, changeLeadStageBodySchema, findLeadQuerySchema } from "./schema.js";
import { addLeadCommentController, changeLeadStageController, findLeadController } from "./controller.js";

const leadsRoutes: FastifyPluginAsync = async (app) => {
    app.get("/",
        {
            schema:
            {
                querystring: findLeadQuerySchema,
            }
        },
        findLeadController)

    app.post("/:leadId/notes",
        {
            schema:
            {
                params: addLeadCommentParamsSchema,
                body: addLeadCommentBodySchema,
            }
        },
        addLeadCommentController)

    app.patch("/:leadId/stage",
        {
            schema:
            {
                params: changeLeadStageParamsSchema,
                body: changeLeadStageBodySchema,
            }
        },
        changeLeadStageController)
}

export default leadsRoutes;
