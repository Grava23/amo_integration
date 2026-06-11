import { refreshToken } from "./refresh_token.js"
import { logger } from "../../logger.js"
import type { Integration } from "../../models/integration.js"
import type { GetAccessTokenResponse } from "./auth.js"

interface TokenStorage {
  getIntegrationByDomain(domain: string): Promise<Integration>
  updateIntegrationTokens(domain: string, accessToken: string, refreshToken: string): Promise<unknown>
}

interface AmoAuthRefresher {
  refreshToken(refreshToken: string, domain: string): Promise<GetAccessTokenResponse>
}

function isUnauthorizedError(error: unknown): boolean {
  const maybeHttpError = error as { response?: { status?: number } }

  if (maybeHttpError.response?.status === 401) {
    return true
  }

  const message = error instanceof Error ? error.message : String(error)
  return message.includes("HTTP 401")
}

export async function withAmoTokenRefresh<T>(
  integration: Integration,
  storage: TokenStorage,
  auth: AmoAuthRefresher,
  request: (accessToken: string) => Promise<T>
): Promise<T> {
  try {
    return await request(integration.accessToken)
  } catch (error) {
    logger.error("withAmoTokenRefresh - request", { error: error as Error })

    if (!isUnauthorizedError(error)) {
      throw new Error(`withAmoTokenRefresh - request: ${error as Error}`)
    }
  }

  try {
    const refreshedIntegration = await refreshToken(integration.domain, storage, auth)
    integration.accessToken = refreshedIntegration.accessToken
    integration.refreshToken = refreshedIntegration.refreshToken
  } catch (error) {
    logger.error("withAmoTokenRefresh - refresh token", { error: error as Error })
    throw new Error(`withAmoTokenRefresh - refresh token: ${error as Error}`)
  }

  try {
    return await request(integration.accessToken)
  } catch (error) {
    logger.error("withAmoTokenRefresh - request after refresh", { error: error as Error })
    throw new Error(`withAmoTokenRefresh - request after refresh: ${error as Error}`)
  }
}
