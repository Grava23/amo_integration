import { describe, it, expect } from "vitest"
import {
    addLeadCommentParamsSchema,
    addLeadCommentBodySchema,
    changeLeadStageParamsSchema,
    changeLeadStageBodySchema,
} from "../../../src/modules/leads/schema.js"

describe("addLeadCommentParamsSchema", () => {
    it("coerces a numeric string leadId to a number", () => {
        const parsed = addLeadCommentParamsSchema.parse({ leadId: "555" })
        expect(parsed.leadId).toBe(555)
    })

    it("rejects a negative leadId", () => {
        expect(addLeadCommentParamsSchema.safeParse({ leadId: "-1" }).success).toBe(false)
    })

    it("rejects a non-numeric leadId", () => {
        expect(addLeadCommentParamsSchema.safeParse({ leadId: "abc" }).success).toBe(false)
    })

    it("rejects a non-integer leadId", () => {
        expect(addLeadCommentParamsSchema.safeParse({ leadId: "1.5" }).success).toBe(false)
    })
})

describe("addLeadCommentBodySchema", () => {
    it("parses a valid body", () => {
        const parsed = addLeadCommentBodySchema.parse({
            domain: "test.amocrm.ru",
            text: "hello",
        })
        expect(parsed.domain).toBe("test.amocrm.ru")
        expect(parsed.text).toBe("hello")
    })

    it("rejects an empty text", () => {
        expect(addLeadCommentBodySchema.safeParse({ domain: "x", text: "" }).success).toBe(false)
    })

    it("rejects a missing domain", () => {
        expect(addLeadCommentBodySchema.safeParse({ text: "hello" }).success).toBe(false)
    })
})

describe("changeLeadStageParamsSchema", () => {
    it("coerces a numeric string leadId to a number", () => {
        const parsed = changeLeadStageParamsSchema.parse({ leadId: "555" })
        expect(parsed.leadId).toBe(555)
    })

    it("rejects a non-numeric leadId", () => {
        expect(changeLeadStageParamsSchema.safeParse({ leadId: "abc" }).success).toBe(false)
    })
})

describe("changeLeadStageBodySchema", () => {
    it("parses a valid body", () => {
        const parsed = changeLeadStageBodySchema.parse({ domain: "test.amocrm.ru" })
        expect(parsed.domain).toBe("test.amocrm.ru")
    })

    it("rejects a missing domain", () => {
        expect(changeLeadStageBodySchema.safeParse({}).success).toBe(false)
    })
})
