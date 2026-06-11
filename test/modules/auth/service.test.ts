import { describe, it, expect, vi, beforeEach } from "vitest"
import { AuthService } from "../../../src/modules/auth/service.js"

function makeAccessToken() {
    return {
        access_token: "new-access",
        refresh_token: "new-refresh",
        token_type: "Bearer",
        expires_in: 86400,
    }
}

describe("AuthService", () => {
    let authRepo: any
    let amoClient: any

    beforeEach(() => {
        authRepo = {
            createOauthState: vi.fn().mockResolvedValue(undefined),
            consumeOauthState: vi.fn().mockResolvedValue(undefined),
            getIntegrationByDomain: vi.fn(),
            upsertIntegration: vi.fn().mockResolvedValue(undefined),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
        }
        amoClient = {
            auth: {
                getAccessToken: vi.fn().mockResolvedValue(makeAccessToken()),
                refreshToken: vi.fn(),
            },
            account: {
                getAmojoID: vi.fn().mockResolvedValue("amojo-123"),
            },
        }
    })

    describe("start", () => {
        it("создаёт oauth-state и возвращает URL с client_id и state", async () => {
            const svc = new AuthService(authRepo, amoClient)

            const url = await svc.start()

            expect(authRepo.createOauthState).toHaveBeenCalledOnce()
            const stateArg = authRepo.createOauthState.mock.calls[0][0].state
            expect(typeof stateArg).toBe("string")
            expect(stateArg.length).toBeGreaterThan(0)

            const parsed = new URL(url)
            expect(parsed.searchParams.get("client_id")).toBe("test-client-id")
            expect(parsed.searchParams.get("state")).toBe(stateArg)
        })

        it("бросает 'create oauth state', если createOauthState упал", async () => {
            authRepo.createOauthState.mockRejectedValue(new Error("db down"))
            const svc = new AuthService(authRepo, amoClient)

            await expect(svc.start()).rejects.toThrow("create oauth state")
        })
    })

    describe("completeOauth", () => {
        it("бросает 'consume oauth state', если consumeOauthState упал", async () => {
            authRepo.consumeOauthState.mockRejectedValue(new Error("bad state"))
            const svc = new AuthService(authRepo, amoClient)

            await expect(svc.completeOauth("state", "code", "https://mycompany.amocrm.ru/"))
                .rejects.toThrow("consume oauth state")
        })

        it("happy path: P2025 → новая интеграция, домен из referer, upsert с корректным доменом", async () => {
            authRepo.getIntegrationByDomain.mockRejectedValue({ code: "P2025" })
            const svc = new AuthService(authRepo, amoClient)

            await svc.completeOauth("state", "code", "https://mycompany.amocrm.ru/")

            expect(amoClient.auth.getAccessToken).toHaveBeenCalledWith("code", "mycompany.amocrm.ru")
            expect(amoClient.account.getAmojoID).toHaveBeenCalledWith("mycompany.amocrm.ru", "new-access")
            expect(amoClient.auth.refreshToken).not.toHaveBeenCalled()
            expect(authRepo.upsertIntegration).toHaveBeenCalledOnce()
            const upserted = authRepo.upsertIntegration.mock.calls[0][0]
            expect(upserted.domain).toBe("mycompany.amocrm.ru")
            expect(upserted.accessToken).toBe("new-access")
            expect(upserted.refreshToken).toBe("new-refresh")
            expect(upserted.amojoID).toBe("amojo-123")
        })

        it("happy path: существующая интеграция, домен из referer", async () => {
            authRepo.getIntegrationByDomain.mockResolvedValue({
                domain: "old.amocrm.ru",
                accessToken: "a",
                refreshToken: "r",
                amojoID: "old-amojo",
                scopeID: "scope",
                active: true,
            })
            const svc = new AuthService(authRepo, amoClient)

            await svc.completeOauth("state", "code", "https://mycompany.amocrm.ru/")

            const upserted = authRepo.upsertIntegration.mock.calls[0][0]
            expect(upserted.domain).toBe("mycompany.amocrm.ru")
        })

        it("бросает 'get access token', если getAccessToken упал", async () => {
            authRepo.getIntegrationByDomain.mockRejectedValue({ code: "P2025" })
            amoClient.auth.getAccessToken.mockRejectedValue(new Error("token boom"))
            const svc = new AuthService(authRepo, amoClient)

            await expect(svc.completeOauth("state", "code", "https://mycompany.amocrm.ru/"))
                .rejects.toThrow("get access token")
        })

        it("бросает 'upsert integration', если upsertIntegration упал", async () => {
            authRepo.getIntegrationByDomain.mockRejectedValue({ code: "P2025" })
            authRepo.upsertIntegration.mockRejectedValue(new Error("upsert boom"))
            const svc = new AuthService(authRepo, amoClient)

            await expect(svc.completeOauth("state", "code", "https://mycompany.amocrm.ru/"))
                .rejects.toThrow("upsert integration")
        })

        it("прокидывает не-P2025 ошибку getIntegrationByDomain как 'get integration by domain'", async () => {
            authRepo.getIntegrationByDomain.mockRejectedValue({ code: "OTHER" })
            const svc = new AuthService(authRepo, amoClient)

            await expect(svc.completeOauth("state", "code", "https://mycompany.amocrm.ru/"))
                .rejects.toThrow("get integration by domain")
        })
    })
})
