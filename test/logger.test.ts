import { describe, it, expect, vi } from "vitest"

describe("logger (real implementation)", () => {
    it("info/error/warn/debug не бросают со строкой и с params", async () => {
        const actual = (await vi.importActual("../src/logger.js")) as {
            logger: {
                info: (msg: string, params?: Record<string, unknown>) => void
                error: (msg: string, params?: Record<string, unknown>) => void
                warn: (msg: string, params?: Record<string, unknown>) => void
                debug: (msg: string, params?: Record<string, unknown>) => void
            }
        }

        expect(() => actual.logger.info("hello")).not.toThrow()
        expect(() => actual.logger.info("hello", { a: 1 })).not.toThrow()
        expect(() => actual.logger.error("err")).not.toThrow()
        expect(() => actual.logger.error("err", { b: 2 })).not.toThrow()
        expect(() => actual.logger.warn("warn")).not.toThrow()
        expect(() => actual.logger.warn("warn", { c: 3 })).not.toThrow()
        expect(() => actual.logger.debug("dbg")).not.toThrow()
        expect(() => actual.logger.debug("dbg", { d: 4 })).not.toThrow()
    })
})
