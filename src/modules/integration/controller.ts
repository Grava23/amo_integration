import { FastifyRequest, FastifyReply } from "fastify";
import { AmoTokenBody, IntegrationDomainParams, LeadStageSettingsBody, UpdateIntegrationActiveParams, UpdateIntegrationActiveRequest } from "./schema.js";
import { IntegrationRepo } from "./repo.js";
import { IntegrationSettingsService } from "./settings_service.js";
import { LeadStageSettings } from "../../models/integration_settings.js";
import { LeadStageEvent } from "../../models/lead_stage_event.js";

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

export async function disconnectIntegrationController(req: FastifyRequest<{ Params: IntegrationDomainParams }>, reply: FastifyReply) {
    const { domain } = req.params

    const repo = new IntegrationRepo(req.server.prisma)

    try {
        await repo.softDeleteIntegration(domain, new Date())
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }

    return reply.status(200).send({ message: "Integration disconnected" })
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
        priority_open_status_id: s.priorityOpenStatusId,
        comment_template: s.commentTemplate,
        ai_pipeline_id: s.aiPipelineId,
        ai_trigger_status_id: s.aiTriggerStatusId,
        ai_responsible_user_id: s.aiResponsibleUserId,
        ai_start_time_field_id: s.aiStartTimeFieldId,
        autoblock_status_id: s.autoblockStatusId,
        handoff_status_id: s.handoffStatusId,
        success_status_id: s.successStatusId,
    }
}

function serializeEvent(e: LeadStageEvent) {
    return {
        id: e.id,
        source: e.source,
        lead_id: e.leadId,
        status_id: e.statusId,
        pipeline_id: e.pipelineId,
        responsible_user_id: e.responsibleUserId,
        success: e.success,
        error: e.error,
        created_at: e.createdAt.toISOString(),
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
    const {
        status_id, pipeline_id, responsible_user_id, priority_open_status_id, comment_template,
        ai_pipeline_id, ai_trigger_status_id, ai_responsible_user_id, ai_start_time_field_id,
        autoblock_status_id, handoff_status_id, success_status_id,
    } = req.body

    try {
        const settings = await makeSettingsService(req).saveLeadStageSettings(domain, {
            statusId: status_id ?? null,
            pipelineId: pipeline_id ?? null,
            responsibleUserId: responsible_user_id ?? null,
            priorityOpenStatusId: priority_open_status_id ?? null,
            commentTemplate: comment_template ?? null,
            aiPipelineId: ai_pipeline_id ?? null,
            aiTriggerStatusId: ai_trigger_status_id ?? null,
            aiResponsibleUserId: ai_responsible_user_id ?? null,
            aiStartTimeFieldId: ai_start_time_field_id ?? null,
            autoblockStatusId: autoblock_status_id ?? null,
            handoffStatusId: handoff_status_id ?? null,
            successStatusId: success_status_id ?? null,
        })
        return reply.status(200).send(serializeSettings(settings))
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }
}

export async function setAmoTokenController(req: FastifyRequest<{ Params: IntegrationDomainParams, Body: AmoTokenBody }>, reply: FastifyReply) {
    const { domain } = req.params
    const { amo_api_token } = req.body

    try {
        await makeSettingsService(req).setAmoToken(domain, amo_api_token)
        return reply.status(200).send({ message: "amo token updated" })
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

export async function getHealthController(req: FastifyRequest<{ Params: IntegrationDomainParams }>, reply: FastifyReply) {
    const { domain } = req.params
    try {
        const result = await makeSettingsService(req).checkHealth(domain)
        return reply.status(200).send(result)
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }
}

export async function getActivityController(req: FastifyRequest<{ Params: IntegrationDomainParams }>, reply: FastifyReply) {
    const { domain } = req.params
    try {
        const events = await makeSettingsService(req).listActivity(domain)
        return reply.status(200).send({ events: events.map(serializeEvent) })
    } catch (error) {
        return reply.status(500).send({ message: "Internal server error", error: (error as Error).message })
    }
}