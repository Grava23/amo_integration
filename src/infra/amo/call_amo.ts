import { withAmoTokenRefresh } from "./with_token_refresh.js"
import type { Integration } from "../../models/integration.js"
import type { GetAccessTokenResponse } from "./auth.js"

interface TokenStorage {
    getIntegrationByDomain(domain: string): Promise<Integration>
    updateIntegrationTokens(domain: string, accessToken: string, refreshToken: string): Promise<unknown>
}

interface AmoAuthRefresher {
    refreshToken(refreshToken: string, domain: string): Promise<GetAccessTokenResponse>
}

/**
 * Единая точка вызова amoCRM API.
 *
 * Если у интеграции задан статичный долгоживущий Bearer-токен (`amoApiToken`, как в n8n) —
 * используем его напрямую, без OAuth-рефреша. Иначе работает старый поток
 * `withAmoTokenRefresh` (рефреш по 401). Сигнатура совпадает с `withAmoTokenRefresh`,
 * поэтому замена в местах вызова — точечная.
 */
export function callAmo<T>(
    integration: Integration,
    storage: TokenStorage,
    auth: AmoAuthRefresher,
    request: (accessToken: string) => Promise<T>,
): Promise<T> {
    if (integration.amoApiToken) {
        return request(integration.amoApiToken)
    }
    return withAmoTokenRefresh(integration, storage, auth, request)
}
