import { describe, it, expect, vi } from "vitest"
import { createAuthAPI } from "../../../src/infra/amo/auth.js"

describe("createAuthAPI", () => {
    describe("getAccessToken", () => {
        it("POST на oauth2/access_token с grant_type authorization_code", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ access_token: "a", refresh_token: "r" }) } as any
            const api = createAuthAPI(clientStub)

            const result = await api.getAccessToken("the-code", "test.amocrm.ru")
            expect(result).toEqual({ access_token: "a", refresh_token: "r" })

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/oauth2/access_token")
            expect(sentReq.url).toBe("https://test.amocrm.ru/oauth2/access_token")
            expect(sentReq.method).toBe("POST")
            expect(sentReq.headers.get("Content-Type")).toBe("application/json")

            const body = JSON.parse(await sentReq.text())
            expect(body.client_id).toBe("test-client-id")
            expect(body.client_secret).toBe("test-client-secret")
            expect(body.grant_type).toBe("authorization_code")
            expect(body.code).toBe("the-code")
            expect(body.redirect_uri).toBe("http://localhost:8080/api/v1/auth/oauth/complete")
        })
    })

    describe("refreshToken", () => {
        it("POST на oauth2/access_token с grant_type refresh_token", async () => {
            const clientStub = { request: vi.fn().mockResolvedValue({ access_token: "a2", refresh_token: "r2" }) } as any
            const api = createAuthAPI(clientStub)

            const result = await api.refreshToken("the-refresh", "test.amocrm.ru")
            expect(result).toEqual({ access_token: "a2", refresh_token: "r2" })

            const sentReq = clientStub.request.mock.calls[0][0] as Request
            const url = new URL(sentReq.url)
            expect(url.pathname).toBe("/oauth2/access_token")
            expect(sentReq.method).toBe("POST")
            expect(sentReq.headers.get("Content-Type")).toBe("application/json")

            const body = JSON.parse(await sentReq.text())
            expect(body.client_id).toBe("test-client-id")
            expect(body.client_secret).toBe("test-client-secret")
            expect(body.grant_type).toBe("refresh_token")
            expect(body.refresh_token).toBe("the-refresh")
            expect(body.redirect_uri).toBe("http://localhost:8080/api/v1/auth/oauth/complete")
        })
    })
})
