import { FastifyRequest, FastifyReply } from "fastify";
import { IntegrationDomainParams, LeadStageSettingsBody, UpdateIntegrationActiveParams, UpdateIntegrationActiveRequest } from "./schema.js";
import { IntegrationRepo } from "./repo.js";
import { IntegrationSettingsService } from "./settings_service.js";
import { LeadStageSettings } from "../../models/integration_settings.js";
import { logger } from "../../logger.js";

export async function updateIntegrationActiveController(req: FastifyRequest<{ Params: UpdateIntegrationActiveParams, Body: UpdateIntegrationActiveRequest }>, reply: FastifyReply) {
    const { domain } = req.params
    const { active } = req.body

    const repo = new IntegrationRepo(req.server.prisma)

    try {
        await repo.updateIntegrationActive(domain, active)
    } catch (error) {
        throw new Error(`updateIntegrationActiveController - updateIntegrationActive - updateIntegrationActive: ${error as Error}`)
    }

    return reply.status(200).send({ message: "Integration active updated" })
}

function makeSettingsService(req: FastifyRequest): IntegrationSettingsService {
    return new IntegrationSettingsService(req.server.amoClient, new IntegrationRepo(req.server.prisma))
}

function serializeSettings(s: LeadStageSettings) {
    return {
        domain: s.domain,
        status_id: s.targetStatusId,
        pipeline_id: s.targetPipelineId,
        responsible_user_id: s.targetResponsibleUserId,
    }
}

export async function listIntegrationsController(req: FastifyRequest, reply: FastifyReply) {
    try {
        const integrations = await makeSettingsService(req).listIntegrations()
        return reply.status(200).send({ integrations })
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }
}

export async function getLeadStageSettingsController(req: FastifyRequest<{ Params: IntegrationDomainParams }>, reply: FastifyReply) {
    const { domain } = req.params
    try {
        const settings = await makeSettingsService(req).getLeadStageSettings(domain)
        return reply.status(200).send(serializeSettings(settings))
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }
}

export async function putLeadStageSettingsController(req: FastifyRequest<{ Params: IntegrationDomainParams, Body: LeadStageSettingsBody }>, reply: FastifyReply) {
    const { domain } = req.params
    const { status_id, pipeline_id, responsible_user_id } = req.body

    try {
        const settings = await makeSettingsService(req).saveLeadStageSettings(domain, {
            statusId: status_id ?? null,
            pipelineId: pipeline_id ?? null,
            responsibleUserId: responsible_user_id ?? null,
        })
        return reply.status(200).send(serializeSettings(settings))
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }
}

export async function getPipelinesController(req: FastifyRequest<{ Params: IntegrationDomainParams }>, reply: FastifyReply) {
    const { domain } = req.params
    try {
        const data = await makeSettingsService(req).getPipelines(domain)
        const pipelines = data._embedded.pipelines.map((p) => ({
            id: p.id,
            name: p.name,
            statuses: p._embedded.statuses.map((s) => ({ id: s.id, name: s.name })),
        }))
        return reply.status(200).send({ pipelines })
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }
}

export async function getUsersController(req: FastifyRequest<{ Params: IntegrationDomainParams }>, reply: FastifyReply) {
    const { domain } = req.params
    try {
        const data = await makeSettingsService(req).getUsers(domain)
        const users = data._embedded.users.map((u) => ({ id: u.id, name: u.name, email: u.email }))
        return reply.status(200).send({ users })
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }
}