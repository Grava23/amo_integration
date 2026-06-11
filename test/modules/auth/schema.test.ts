import { describe, it, expect } from "vitest"
import { completeOauthQuerySchema } from "../../../src/modules/auth/schema.js"

describe("completeOauthQuerySchema", () => {
    it("defaults referer to empty string when not provided", () => {
        const parsed = completeOauthQuerySchema.parse({})
        expect(parsed.referer).toBe("")
    })

    it("keeps a provided referer", () => {
        const parsed = completeOauthQuerySchema.parse({ referer: "https://x.amocrm.ru" })
        expect(parsed.referer).toBe("https://x.amocrm.ru")
    })

    it("treats all fields as optional", () => {
        const value = {
            state: "s",
            code: "c",
            referer: "r",
            error: "e",
        }
        expect(() => completeOauthQuerySchema.parse(value)).not.toThrow()
        expect(completeOauthQuerySchema.safeParse({}).success).toBe(true)
    })
})
