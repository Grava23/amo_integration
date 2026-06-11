import { FastifyPluginAsync } from "fastify";
import { addLeadCommentParamsSchema, addLeadCommentBodySchema, changeLeadStageParamsSchema, changeLeadStageBodySchema } from "./schema.js";
import { addLeadCommentController, changeLeadStageController } from "./controller.js";

const leadsRoutes: FastifyPluginAsync = async (app) => {
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
