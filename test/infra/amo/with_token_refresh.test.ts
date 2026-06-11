import { describe, it, expect, vi, beforeEach } from "vitest"
import { withAmoTokenRefresh } from "../../../src/infra/amo/with_token_refresh.js"
import type { Integration } from "../../../src/models/integration.js"

function makeIntegration(): Integration {
    return {
        domain: "test.amocrm.ru",
        accessToken: "old-access",
        refreshToken: "old-refresh",
        amojoID: "amojo",
        scopeID: "scope",
        active: true,
    }
}

describe("withAmoTokenRefresh", () => {
    let storage: { getIntegrationByDomain: any; updateIntegrationTokens: any }
    let auth: { refreshToken: any }

    beforeEach(() => {
        storage = {
            getIntegrationByDomain: vi.fn(),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
        }
        auth = { refreshToken: vi.fn() }
    })

    it("возвращает результат без рефреша, если запрос успешен", async () => {
        const integration = makeIntegration()
        const request = vi.fn(async (token: string) => `ok:${token}`)

        const result = await withAmoTokenRefresh(integration, storage, auth, request)

        expect(result).toBe("ok:old-access")
        expect(request).toHaveBeenCalledOnce()
        expect(auth.refreshToken).not.toHaveBeenCalled()
    })

    it("прокидывает не-401 ошибку без рефреша", async () => {
        const integration = makeIntegration()
        const request = vi.fn(async () => { throw new Error("HTTP 500: boom") })

        await expect(withAmoTokenRefresh(integration, storage, auth, request))
            .rejects.toThrow("withAmoTokenRefresh - request")
        expect(auth.refreshToken).not.toHaveBeenCalled()
    })

    it("при 401 обновляет токен и повторяет запрос", async () => {
        const integration = makeIntegration()
        storage.getIntegrationByDomain.mockResolvedValue(makeIntegration())
        auth.refreshToken.mockResolvedValue({ access_token: "new-access", refresh_token: "new-refresh" })

        const request = vi.fn()
            .mockRejectedValueOnce(new Error("HTTP 401: unauthorized"))
            .mockImplementationOnce(async (token: string) => `ok:${token}`)

        const result = await withAmoTokenRefresh(integration, storage, auth, request)

        expect(result).toBe("ok:new-access")
        expect(auth.refreshToken).toHaveBeenCalledWith("old-refresh", "test.amocrm.ru")
        expect(storage.updateIntegrationTokens).toHaveBeenCalledWith("test.amocrm.ru", "new-access", "new-refresh")
        expect(integration.accessToken).toBe("new-access")
    })

    it("распознаёт 401 по error.response.status", async () => {
        const integration = makeIntegration()
        storage.getIntegrationByDomain.mockResolvedValue(makeIntegration())
        auth.refreshToken.mockResolvedValue({ access_token: "new-access", refresh_token: "new-refresh" })

        const request = vi.fn()
            .mockRejectedValueOnce({ response: { status: 401 } })
            .mockResolvedValueOnce("recovered")

        await expect(withAmoTokenRefresh(integration, storage, auth, request)).resolves.toBe("recovered")
    })

    it("бросает ошибку, если рефреш не удался", async () => {
        const integration = makeIntegration()
        storage.getIntegrationByDomain.mockResolvedValue(makeIntegration())
        auth.refreshToken.mockRejectedValue(new Error("refresh boom"))

        const request = vi.fn().mockRejectedValue(new Error("HTTP 401"))

        await expect(withAmoTokenRefresh(integration, storage, auth, request))
            .rejects.toThrow("withAmoTokenRefresh - refresh token")
    })

    it("бросает ошибку, если повторный запрос после рефреша упал", async () => {
        const integration = makeIntegration()
        storage.getIntegrationByDomain.mockResolvedValue(makeIntegration())
        auth.refreshToken.mockResolvedValue({ access_token: "new-access", refresh_token: "new-refresh" })

        const request = vi.fn()
            .mockRejectedValueOnce(new Error("HTTP 401"))
            .mockRejectedValueOnce(new Error("still failing"))

        await expect(withAmoTokenRefresh(integration, storage, auth, request))
            .rejects.toThrow("withAmoTokenRefresh - request after refresh")
    })
})
