import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

describe("oauth_urls", () => {
    const originalApiPublicUrl = process.env.API_PUBLIC_URL

    beforeEach(() => {
        vi.resetModules()
    })

    afterEach(() => {
        if (originalApiPublicUrl === undefined) {
            delete process.env.API_PUBLIC_URL
        } else {
            process.env.API_PUBLIC_URL = originalApiPublicUrl
        }
        vi.resetModules()
    })

    it("apiPublicOrigin: использует API_PUBLIC_URL, срезая хвостовой слеш", async () => {
        process.env.API_PUBLIC_URL = "https://api.example.com/"
        const { apiPublicOrigin } = await import("../../../src/modules/auth/oauth_urls.js")

        expect(apiPublicOrigin()).toBe("https://api.example.com")
    })

    it("apiPublicOrigin: без API_PUBLIC_URL возвращает http://localhost:PORT", async () => {
        delete process.env.API_PUBLIC_URL
        const { apiPublicOrigin } = await import("../../../src/modules/auth/oauth_urls.js")

        expect(apiPublicOrigin()).toBe("http://localhost:8080")
    })

    it("recommendedOauthRedirectUri: добавляет путь complete к origin (с API_PUBLIC_URL)", async () => {
        process.env.API_PUBLIC_URL = "https://api.example.com/"
        const { recommendedOauthRedirectUri } = await import("../../../src/modules/auth/oauth_urls.js")

        expect(recommendedOauthRedirectUri()).toBe("https://api.example.com/api/v1/auth/oauth/complete")
    })

    it("recommendedOauthRedirectUri: добавляет путь complete к localhost (без API_PUBLIC_URL)", async () => {
        delete process.env.API_PUBLIC_URL
        const { recommendedOauthRedirectUri } = await import("../../../src/modules/auth/oauth_urls.js")

        expect(recommendedOauthRedirectUri()).toBe("http://localhost:8080/api/v1/auth/oauth/complete")
    })
})
