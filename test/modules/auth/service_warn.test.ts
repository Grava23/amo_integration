import { describe, it, expect, vi, afterEach } from "vitest"

describe("AuthService.start — предупреждение при пустом AMO_REDIRECT_URI", () => {
    const prev = process.env.AMO_REDIRECT_URI

    afterEach(() => {
        process.env.AMO_REDIRECT_URI = prev
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it("логирует warn, но всё равно возвращает authorize URL", async () => {
        process.env.AMO_REDIRECT_URI = ""
        vi.resetModules()

        // импортируем в одном графе модулей после reset: logger будет тем же (замоканным) инстансом
        const { logger } = await import("../../../src/logger.js")
        const { AuthService } = await import("../../../src/modules/auth/service.js")

        const repo: any = { createOauthState: vi.fn().mockResolvedValue({}) }
        const amoClient: any = { auth: {}, account: {} }
        const svc = new AuthService(repo, amoClient)

        const url = await svc.start()

        expect(url).toContain("client_id=test-client-id")
        expect(url).toContain("state=")
        expect(logger.warn).toHaveBeenCalled()
    })
})
