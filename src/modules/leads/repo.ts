import { PrismaClient } from "../../generated/prisma/client.js";
import { Integration } from "../../models/integration.js";
import { LeadStageSettings } from "../../models/integration_settings.js";

export class LeadsRepo {
    constructor(private prisma: PrismaClient) { }

    /** Настройки этапа/ответственного для домена. null — если ещё не заданы. */
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
}
