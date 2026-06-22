import { PrismaClient } from "../../generated/prisma/client.js";
import { Integration } from "../../models/integration.js";
import { LeadStageSettings, toLeadStageSettings } from "../../models/integration_settings.js";
import { LeadStageEvent } from "../../models/lead_stage_event.js";

export type IntegrationListItem = {
    domain: string
    active: boolean
}

export class IntegrationRepo {
    constructor(private prisma: PrismaClient) { }

    async updateIntegrationActive(domain: string, active: boolean) {
        return await this.prisma.integrations.update({
            where: { domain, deleted_at: null },
            data: { active },
        })
    }

    /** Мягкое отключение интеграции: проставляем deleted_at, строка перестаёт быть видимой. */
    async softDeleteIntegration(domain: string, now: Date) {
        return await this.prisma.integrations.update({
            where: { domain, deleted_at: null },
            data: { deleted_at: now, active: false },
        })
    }

    /** Список не удалённых интеграций (для выбора домена на фронте). */
    async listIntegrations(): Promise<IntegrationListItem[]> {
        const rows = await this.prisma.integrations.findMany({
            where: { deleted_at: null },
            select: { domain: true, active: true },
            orderBy: { domain: "asc" },
        })

        return rows.map((r) => ({ domain: r.domain, active: r.active }))
    }

    // ---- token storage (для withAmoTokenRefresh) ----

    async getIntegrationByDomain(domain: string): Promise<Integration> {
        const row = await this.prisma.integrations.findUniqueOrThrow({
            where: { domain, deleted_at: null },
        })

        return {
            domain: row.domain,
            accessToken: row.access_token,
            refreshToken: row.refresh_token,
            amojoID: row.amojo_id,
            scopeID: row.scope_id,
            active: row.active,
            amoApiToken: row.amo_api_token,
        }
    }

    async updateIntegrationTokens(domain: string, accessToken: string, refreshToken: string) {
        return await this.prisma.integrations.update({
            where: { domain, deleted_at: null },
            data: {
                access_token: accessToken,
                refresh_token: refreshToken,
            },
        })
    }

    // ---- lead stage settings ----

    async getLeadStageSettings(domain: string): Promise<LeadStageSettings | null> {
        const row = await this.prisma.integration_settings.findUnique({
            where: { domain },
        })

        return row ? toLeadStageSettings(row) : null
    }

    async upsertLeadStageSettings(domain: string, settings: Omit<LeadStageSettings, "domain">): Promise<LeadStageSettings> {
        const data = {
            target_status_id: settings.targetStatusId,
            target_pipeline_id: settings.targetPipelineId,
            target_responsible_user_id: settings.targetResponsibleUserId,
            priority_open_status_id: settings.priorityOpenStatusId,
            comment_template: settings.commentTemplate,
            ai_pipeline_id: settings.aiPipelineId,
            ai_trigger_status_id: settings.aiTriggerStatusId,
            ai_responsible_user_id: settings.aiResponsibleUserId,
            ai_start_time_field_id: settings.aiStartTimeFieldId,
            autoblock_status_id: settings.autoblockStatusId,
            handoff_status_id: settings.handoffStatusId,
            success_status_id: settings.successStatusId,
        }

        const row = await this.prisma.integration_settings.upsert({
            where: { domain },
            create: { domain, ...data },
            update: data,
        })

        return toLeadStageSettings(row)
    }

    /** Сохраняем статичный Bearer-токен amoCRM для домена. */
    async setAmoToken(domain: string, token: string) {
        return await this.prisma.integrations.update({
            where: { domain, deleted_at: null },
            data: { amo_api_token: token },
        })
    }

    /** Последние записи журнала смены этапа для домена. */
    async listStageEvents(domain: string, limit = 20): Promise<LeadStageEvent[]> {
        const rows = await this.prisma.lead_stage_events.findMany({
            where: { domain },
            orderBy: { created_at: "desc" },
            take: limit,
        })

        return rows.map((r) => ({
            id: r.id,
            domain: r.domain,
            source: r.source === "wazup" || r.source === "pact" || r.source === "ai" ? r.source : "manual",
            leadId: r.lead_id,
            statusId: r.status_id,
            pipelineId: r.pipeline_id,
            responsibleUserId: r.responsible_user_id,
            success: r.success,
            error: r.error,
            createdAt: r.created_at,
        }))
    }
}