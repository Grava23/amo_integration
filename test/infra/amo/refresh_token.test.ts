import { describe, it, expect, vi, beforeEach } from "vitest"
import { refreshToken } from "../../../src/infra/amo/refresh_token.js"

function makeIntegration() {
    return {
        domain: "test.amocrm.ru",
        accessToken: "old-access",
        refreshToken: "old-refresh",
        amojoID: "amojo",
        scopeID: "scope",
        active: true,
    }
}

function makeTokens() {
    return {
        access_token: "new-access",
        refresh_token: "new-refresh",
        token_type: "Bearer",
        expires_in: 86400,
    }
}

describe("refreshToken", () => {
    let storage: any
    let amoClient: any

    beforeEach(() => {
        storage = {
            getIntegrationByDomain: vi.fn().mockResolvedValue(makeIntegration()),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
        }
        amoClient = {
            refreshToken: vi.fn().mockResolvedValue(makeTokens()),
        }
    })

    it("успех: обновляет токены в integration и сохраняет их, возвращает integration", async () => {
        const result = await refreshToken("test.amocrm.ru", storage, amoClient)

        expect(amoClient.refreshToken).toHaveBeenCalledWith("old-refresh", "test.amocrm.ru")
        expect(storage.updateIntegrationTokens).toHaveBeenCalledWith(
            "test.amocrm.ru",
            "new-access",
            "new-refresh",
        )
        expect(result.accessToken).toBe("new-access")
        expect(result.refreshToken).toBe("new-refresh")
        expect(result.domain).toBe("test.amocrm.ru")
    })

    it("бросает 'get integration by domain', если получение интеграции упало", async () => {
        storage.getIntegrationByDomain.mockRejectedValue(new Error("db down"))

        await expect(refreshToken("test.amocrm.ru", storage, amoClient))
            .rejects.toThrow("get integration by domain")
        expect(amoClient.refreshToken).not.toHaveBeenCalled()
    })

    it("бросает 'refresh token', если amoClient.refreshToken упал", async () => {
        amoClient.refreshToken.mockRejectedValue(new Error("refresh boom"))

        await expect(refreshToken("test.amocrm.ru", storage, amoClient))
            .rejects.toThrow("refresh token")
        expect(storage.updateIntegrationTokens).not.toHaveBeenCalled()
    })

    it("бросает 'update integration tokens', если сохранение токенов упало", async () => {
        storage.updateIntegrationTokens.mockRejectedValue(new Error("save boom"))

        await expect(refreshToken("test.amocrm.ru", storage, amoClient))
            .rejects.toThrow("update integration tokens")
    })
})
