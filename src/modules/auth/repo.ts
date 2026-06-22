import type { PrismaClient } from "../../generated/prisma/client.js"
import type { Integration } from "../../models/integration.js"
import { OAuthState } from "../../models/oauth_state.js"

export class AuthRepo {
  constructor(private prisma: PrismaClient) { }

  async createOauthState(state: OAuthState) {
    return await this.prisma.oauth_states.create({
      data: {
        state: state.state,
        expired_at: state.expiredAt,
      },
    })
  }

  async consumeOauthState(state: string) {
    return await this.prisma.oauth_states.update({
      where: {
        state,
        used: false,
        expired_at: {
          gt: new Date()
        }
      },
      data: { used: true },
    })
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

  async upsertIntegration(integration: Integration) {
    return await this.prisma.integrations.upsert({
      where: { domain: integration.domain, deleted_at: null },
      update: {
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        amojo_id: integration.amojoID,
        scope_id: integration.scopeID,
      },
      create: {
        domain: integration.domain,
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        amojo_id: integration.amojoID,
        scope_id: integration.scopeID,
      },
    })
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

