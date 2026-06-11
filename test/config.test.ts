import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// config.ts парсится на этапе импорта. Каждый тест перезагружает модуль через
// vi.resetModules() + динамический import, аккуратно управляя process.env.
describe("config", () => {
    const saved: Record<string, string | undefined> = {}
    const keys = ["AMO_CLIENT_RETRY_ATTEMPTS", "PORT"]

    beforeEach(() => {
        for (const k of keys) saved[k] = process.env[k]
        vi.resetModules()
    })

    afterEach(() => {
        for (const k of keys) {
            if (saved[k] === undefined) delete process.env[k]
            else process.env[k] = saved[k]
        }
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it("happy path: PORT приведён к числу, дефолты применены", async () => {
        process.env.PORT = "8080"
        delete process.env.AMO_CLIENT_RETRY_ATTEMPTS
        vi.resetModules()

        const { config } = await import("../src/config.js")

        expect(config.PORT).toBe(8080)
        expect(typeof config.PORT).toBe("number")
        expect(config.AMO_CLIENT_RETRY_ATTEMPTS).toBe(3)
        expect(config.HOST).toBe("0.0.0.0")
    })

    it("невалидное окружение: process.exit(1) при провале парсинга", async () => {
        process.env.AMO_CLIENT_RETRY_ATTEMPTS = "not-a-number"
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("exit")
        })
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
        vi.resetModules()

        await expect(import("../src/config.js")).rejects.toThrow("exit")
        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalled()
    })
})
