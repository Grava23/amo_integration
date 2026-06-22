import { PrismaClient } from "../../generated/prisma/client.js";
import { Integration } from "../../models/integration.js";
import { LeadStageSettings, toLeadStageSettings } from "../../models/integration_settings.js";
import { LeadStageEventInput } from "../../models/lead_stage_event.js";

export class WazupRepo {
    constructor(private prisma: PrismaClient) { }

    /** Пишем запись в журнал обработки сделки (best-effort). */
    async createLeadEvent(event: LeadStageEventInput): Promise<void> {
        await this.prisma.lead_stage_events.create({
            data: {
                domain: event.domain,
                source: event.source,
                lead_id: event.leadId,
                status_id: event.statusId,
                pipeline_id: event.pipelineId,
                responsible_user_id: event.responsibleUserId,
                success: event.success,
                error: event.error,
            },
        })
    }

    /** Настройки домена (нужен приоритетный этап выбора сделки). null — если не заданы. */
    async getLeadStageSettings(domain: string): Promise<LeadStageSettings | null> {
        const row = await this.prisma.integration_settings.findUnique({
            where: { domain },
        })

        return row ? toLeadStageSettings(row) : null
    }

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
}