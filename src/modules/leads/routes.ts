import { FastifyPluginAsync } from "fastify";
import { addLeadCommentParamsSchema, addLeadCommentBodySchema, changeLeadStageParamsSchema, changeLeadStageBodySchema, resolveLeadBodySchema, transitionLeadParamsSchema, transitionLeadBodySchema } from "./schema.js";
import { addLeadCommentController, changeLeadStageController, resolveLeadController, transitionLeadController } from "./controller.js";

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

    // ИИ-воронка: подбор сделки по входящему сообщению (контакт + сделка + гейт).
    app.post("/resolve",
        { schema: { body: resolveLeadBodySchema } },
        resolveLeadController)

    // ИИ-воронка: переход сделки (assign_ai | autoblock | handoff | success).
    app.post("/:leadId/transition",
        {
            schema:
            {
                params: transitionLeadParamsSchema,
                body: transitionLeadBodySchema,
            }
        },
        transitionLeadController)
}

export default leadsRoutes;
