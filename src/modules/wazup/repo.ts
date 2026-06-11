import { PrismaClient } from "../../generated/prisma/client.js";
import { Integration } from "../../models/integration.js";

export class WazupRepo {
    constructor(private prisma: PrismaClient) { }

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