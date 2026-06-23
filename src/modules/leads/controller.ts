import { FastifyReply, FastifyRequest } from "fastify";
import { AddLeadCommentBody, AddLeadCommentParams, ChangeLeadStageBody, ChangeLeadStageParams, ResolveLeadBody, TransitionLeadBody, TransitionLeadParams, UpdateLeadBody, UpdateLeadCustomFieldBody, UpdateLeadCustomFieldParams, UpdateLeadParams } from "./schema.js";
import { ConfigError, LeadsService } from "./service.js";
import { LeadsRepo } from "./repo.js";

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

export async function resolveLeadController(req: FastifyRequest<{ Body: ResolveLeadBody }>, reply: FastifyReply) {
    const { domain, chatType, chatId, phone, username } = req.body

    const repo = new LeadsRepo(req.server.prisma)
    const service = new LeadsService(req.server.amoClient, repo)

    try {
        const result = await service.resolveLead(domain, { chatType, chatId, phone, username })
        return reply.status(200).send(result)
    } catch (error) {
        return reply.status(500).send({
            message: "Internal server error",
            error: (error as Error).message,
        })
    }
}

export async function transitionLeadController(req: FastifyRequest<{ Params: TransitionLeadParams, Body: TransitionLeadBody }>, reply: FastifyReply) {
    const { leadId } = req.params
    const { domain, type } = req.body

    const repo = new LeadsRepo(req.server.prisma)
    const service = new LeadsService(req.server.amoClient, repo)

    try {
        const result = await service.applyTransition(domain, leadId, type)
        return reply.status(200).send(result)
    } catch (error) {
        // Не настроены ID в домене — это ошибка запроса, а не сервера.
        if (error instanceof ConfigError) {
            return reply.status(400).send({ message: error.message })
        }
        return reply.status(500).send({
            message: "Internal server error",
            error: (error as Error).message,
        })
    }
}

export async function updateLeadController(req: FastifyRequest<{ Params: UpdateLeadParams, Body: UpdateLeadBody }>, reply: FastifyReply) {
    const { leadId } = req.params
    const { domain, statusId, pipelineId, responsibleUserId } = req.body

    const repo = new LeadsRepo(req.server.prisma)
    const service = new LeadsService(req.server.amoClient, repo)

    try {
        const result = await service.updateLead(domain, leadId, statusId ?? null, pipelineId ?? null, responsibleUserId ?? null)
        return reply.status(200).send(result)
    } catch (error) {
        return reply.status(500).send({
            message: "Internal server error",
            error: (error as Error).message,
        })
    }
}

export async function updateLeadCustomFieldController(req: FastifyRequest<{ Params: UpdateLeadCustomFieldParams, Body: UpdateLeadCustomFieldBody }>, reply: FastifyReply) {
    const { leadId, fieldId } = req.params
    const { domain, value } = req.body

    const repo = new LeadsRepo(req.server.prisma)
    const service = new LeadsService(req.server.amoClient, repo)

    try {
        const result = await service.updateLeadCustomField(domain, leadId, fieldId, value)
        return reply.status(200).send(result)
    } catch (error) {
        return reply.status(500).send({
            message: "Internal server error",
            error: (error as Error).message,
        })
    }
}