import { z } from "zod"

export const updateIntegrationActiveParamsSchema = z.object({
    domain: z.string(),
})

export type UpdateIntegrationActiveParams = z.infer<typeof updateIntegrationActiveParamsSchema>

export const updateIntegrationActiveRequestSchema = z.object({
    active: z.boolean(),
})

export type UpdateIntegrationActiveRequest = z.infer<typeof updateIntegrationActiveRequestSchema>

// Параметр :domain для роутов настроек/дропдаунов.
export const integrationDomainParamsSchema = z.object({
    domain: z.string(),
})

export type IntegrationDomainParams = z.infer<typeof integrationDomainParamsSchema>

// Тело PUT настроек этапа. Каждое поле опционально; null/отсутствие = очистить.
const nullableEntityId = z.coerce.number().int().positive().nullable()

export const leadStageSettingsBodySchema = z.object({
    status_id: nullableEntityId.optional(),
    pipeline_id: nullableEntityId.optional(),
    responsible_user_id: nullableEntityId.optional(),
})

export type LeadStageSettingsBody = z.infer<typeof leadStageSettingsBodySchema>