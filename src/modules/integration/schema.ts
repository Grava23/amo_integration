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
    priority_open_status_id: nullableEntityId.optional(),
    // Пустую строку трактуем как очистку шаблона (null).
    comment_template: z.string().trim().min(1).nullable().optional(),
    // --- ИИ-воронка: все ID per-domain ---
    ai_pipeline_id: nullableEntityId.optional(),
    ai_trigger_status_id: nullableEntityId.optional(),
    ai_responsible_user_id: nullableEntityId.optional(),
    ai_start_time_field_id: nullableEntityId.optional(),
    autoblock_status_id: nullableEntityId.optional(),
    handoff_status_id: nullableEntityId.optional(),
    success_status_id: nullableEntityId.optional(),
})

export type LeadStageSettingsBody = z.infer<typeof leadStageSettingsBodySchema>

// Тело PUT /:domain/amo-token — статичный Bearer-токен amoCRM.
export const amoTokenBodySchema = z.object({
    amo_api_token: z.string().trim().min(1),
})

export type AmoTokenBody = z.infer<typeof amoTokenBodySchema>