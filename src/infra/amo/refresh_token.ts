import { Integration } from "../../models/integration.js";
import { logger } from "../../logger.js";
import { GetAccessTokenResponse } from "./auth.js";

interface AuthStorage {
    getIntegrationByDomain(domain: string): Promise<Integration>
    updateIntegrationTokens(domain: string, accessToken: string, refreshToken: string): Promise<unknown>
}

interface RefreshAmoToken {
    refreshToken(refreshToken: string, domain: string): Promise<GetAccessTokenResponse>
}

export async function refreshToken(domain: string, storage: AuthStorage, amoClient: RefreshAmoToken): Promise<Integration> {
    let integration: Integration | null = null
    try {
        integration = await storage.getIntegrationByDomain(domain)
    } catch (error) {
        logger.error("AuthService - refreshToken - get integration by domain", { error: error as Error })
        throw new Error(`AuthService - refreshToken - get integration by domain: ${error as Error}`)
    }

    try {
        const accessToken = await amoClient.refreshToken(integration.refreshToken, domain)

        integration.accessToken = accessToken.access_token
        integration.refreshToken = accessToken.refresh_token
    } catch (error) {
        logger.error("AuthService - refreshToken - refresh token", { error: error as Error })
        throw new Error(`AuthService - refreshToken - refresh token: ${error as Error}`)
    }

    try {
        await storage.updateIntegrationTokens(domain, integration.accessToken, integration.refreshToken)
    } catch (error) {
        logger.error("AuthService - refreshToken - update integration tokens", { error: error as Error })
        throw new Error(`AuthService - refreshToken - update integration tokens: ${error as Error}`)
    }

    return integration
}