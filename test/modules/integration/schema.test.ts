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

    it("парсит priority_open_status_id и comment_template", () => {
        const parsed = leadStageSettingsBodySchema.parse({ priority_open_status_id: "9", comment_template: "  привет  " })
        expect(parsed.priority_open_status_id).toBe(9)
        expect(parsed.comment_template).toBe("привет")
    })

    it("разрешает null для comment_template (очистка)", () => {
        expect(leadStageSettingsBodySchema.parse({ comment_template: null }).comment_template).toBeNull()
    })

    it("отклоняет пустой/из пробелов comment_template", () => {
        expect(leadStageSettingsBodySchema.safeParse({ comment_template: "" }).success).toBe(false)
        expect(leadStageSettingsBodySchema.safeParse({ comment_template: "   " }).success).toBe(false)
    })
})
