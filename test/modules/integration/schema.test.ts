import { describe, it, expect } from "vitest"
import {
    updateIntegrationActiveParamsSchema,
    updateIntegrationActiveRequestSchema,
    leadStageSettingsBodySchema,
} from "../../../src/modules/integration/schema.js"

describe("updateIntegrationActiveParamsSchema", () => {
    it("parses a string domain", () => {
        const parsed = updateIntegrationActiveParamsSchema.parse({ domain: "test.amocrm.ru" })
        expect(parsed.domain).toBe("test.amocrm.ru")
    })

    it("rejects a non-string domain", () => {
        expect(updateIntegrationActiveParamsSchema.safeParse({ domain: 123 }).success).toBe(false)
    })
})

describe("updateIntegrationActiveRequestSchema", () => {
    it("parses a boolean active", () => {
        expect(updateIntegrationActiveRequestSchema.parse({ active: true }).active).toBe(true)
        expect(updateIntegrationActiveRequestSchema.parse({ active: false }).active).toBe(false)
    })

    it("rejects a non-boolean active", () => {
        expect(updateIntegrationActiveRequestSchema.safeParse({ active: "true" }).success).toBe(false)
        expect(() => updateIntegrationActiveRequestSchema.parse({ active: 1 })).toThrow()
    })
})

describe("leadStageSettingsBodySchema", () => {
    it("парсит полный набор и коэрсит строки в числа", () => {
        const parsed = leadStageSettingsBodySchema.parse({ status_id: "142", pipeline_id: "1", responsible_user_id: "7" })
        expect(parsed).toEqual({ status_id: 142, pipeline_id: 1, responsible_user_id: 7 })
    })

    it("разрешает пустое тело (все поля опциональны)", () => {
        expect(leadStageSettingsBodySchema.parse({})).toEqual({})
    })

    it("разрешает null для очистки", () => {
        expect(leadStageSettingsBodySchema.parse({ status_id: null }).status_id).toBeNull()
    })

    it("отклоняет неположительный id", () => {
        expect(leadStageSettingsBodySchema.safeParse({ status_id: 0 }).success).toBe(false)
        expect(leadStageSettingsBodySchema.safeParse({ pipeline_id: -1 }).success).toBe(false)
    })
})
