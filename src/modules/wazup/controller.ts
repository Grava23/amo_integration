import { FastifyReply, FastifyRequest } from "fastify";
import { WazupWebhookBody } from "./schema.js";
import { WazupService } from "./service.js";
import { WazupRepo } from "./repo.js";

export async function handleWazupWebhookController(req: FastifyRequest<{ Body: WazupWebhookBody }>, reply: FastifyReply) {
    const repo = new WazupRepo(req.server.prisma)
    const service = new WazupService(req.server.amoClient, repo)

    try {
        const result = await service.handleWazupWebhook(req.body)

        if (!result) {
            return reply.status(204).send()
        }

        return reply.status(200).send(result)
    } catch (error) {
        return reply.status(500).send({
            message: "Internal server error",
            error: (error as Error).message,
        })
    }
}
