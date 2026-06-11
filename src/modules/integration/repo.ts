import { PrismaClient } from "../../generated/prisma/client.js";
import { Integration } from "../../models/integration.js";
import { LeadStageSettings } from "../../models/integration_settings.js";

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

        if (!row) return null

        return {
            domain: row.domain,
            targetStatusId: row.target_status_id,
            targetPipelineId: row.target_pipeline_id,
            targetResponsibleUserId: row.target_responsible_user_id,
        }
    }

    async upsertLeadStageSettings(domain: string, settings: Omit<LeadStageSettings, "domain">): Promise<LeadStageSettings> {
        const data = {
            target_status_id: settings.targetStatusId,
            target_pipeline_id: settings.targetPipelineId,
            target_responsible_user_id: settings.targetResponsibleUserId,
        }

        const row = await this.prisma.integration_settings.upsert({
            where: { domain },
            create: { domain, ...data },
            update: data,
        })

        return {
            domain: row.domain,
            targetStatusId: row.target_status_id,
            targetPipelineId: row.target_pipeline_id,
            targetResponsibleUserId: row.target_responsible_user_id,
        }
    }
}