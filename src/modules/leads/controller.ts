import { FastifyReply, FastifyRequest } from "fastify";
import { AddLeadCommentBody, AddLeadCommentParams, ChangeLeadStageBody, ChangeLeadStageParams, FindLeadQuery } from "./schema.js";
import { LeadsService } from "./service.js";
import { LeadsRepo } from "./repo.js";

export async function findLeadController(req: FastifyRequest<{ Querystring: FindLeadQuery }>, reply: FastifyReply) {
    const { domain, phone, username } = req.query

    const repo = new LeadsRepo(req.server.prisma)
    const service = new LeadsService(req.server.amoClient, repo)

    try {
        const result = await service.findLeadByContact(domain, phone, username)

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

export async function addLeadCommentController(req: FastifyRequest<{ Params: AddLeadCommentParams, Body: AddLeadCommentBody }>, reply: FastifyReply) {
    const { leadId } = req.params
    const { domain, text } = req.body

    const repo = new LeadsRepo(req.server.prisma)
    const service = new LeadsService(req.server.amoClient, repo)

    try {
        const result = await service.addComment(domain, leadId, text)
        return reply.status(201).send(result)
    } catch (error) {
        return reply.status(500).send({
            message: "Internal server error",
            error: (error as Error).message,
        })
    }
}

export async function changeLeadStageController(req: FastifyRequest<{ Params: ChangeLeadStageParams, Body: ChangeLeadStageBody }>, reply: FastifyReply) {
    const { leadId } = req.params
    const { domain } = req.body

    const repo = new LeadsRepo(req.server.prisma)
    const service = new LeadsService(req.server.amoClient, repo)

    try {
        const result = await service.changeStageAndResponsible(domain, leadId)
        return reply.status(200).send(result)
    } catch (error) {
        return reply.status(500).send({
            message: "Internal server error",
            error: (error as Error).message,
        })
    }
}
