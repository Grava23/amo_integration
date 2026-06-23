import { z } from "zod"

export const addLeadCommentParamsSchema = z.object({
    leadId: z.coerce.number().int().positive(),
})

export type AddLeadCommentParams = z.infer<typeof addLeadCommentParamsSchema>

export const addLeadCommentBodySchema = z.object({
    domain: z.string(),
    // Если text не передан — используется comment_template из настроек домена.
    text: z.string().min(1).optional(),
})

export type AddLeadCommentBody = z.infer<typeof addLeadCommentBodySchema>

export const changeLeadStageParamsSchema = z.object({
    leadId: z.coerce.number().int().positive(),
})

export type ChangeLeadStageParams = z.infer<typeof changeLeadStageParamsSchema>

export const changeLeadStageBodySchema = z.object({
    domain: z.string(),
})

export type ChangeLeadStageBody = z.infer<typeof changeLeadStageBodySchema>

// ---- ИИ-воронка ----

// POST /leads/resolve — подбор сделки по входящему сообщению.
export const resolveLeadBodySchema = z.object({
    domain: z.string(),
    chatType: z.string().optional(),
    chatId: z.string().optional(),
    phone: z.string().optional(),
    username: z.string().optional(),
})

export type ResolveLeadBody = z.infer<typeof resolveLeadBodySchema>

// POST /leads/:leadId/transition — переход сделки в ИИ-воронке.
export const transitionLeadParamsSchema = z.object({
    leadId: z.coerce.number().int().positive(),
})

export type TransitionLeadParams = z.infer<typeof transitionLeadParamsSchema>

export const transitionLeadBodySchema = z.object({
    domain: z.string(),
    type: z.enum(["assign_ai", "autoblock", "handoff", "success"]),
})

export type TransitionLeadBody = z.infer<typeof transitionLeadBodySchema>

export const updateLeadParamsSchema = z.object({
    leadId: z.coerce.number().int().positive(),
})

export type UpdateLeadParams = z.infer<typeof updateLeadParamsSchema>

export const updateLeadBodySchema = z.object({
    domain: z.string(),
    statusId: z.number().int().positive().optional().nullable(),
    pipelineId: z.number().int().positive().optional().nullable(),
    responsibleUserId: z.number().int().positive().optional().nullable(),
})

export type UpdateLeadBody = z.infer<typeof updateLeadBodySchema>

// PATCH /leads/:leadId/custom-fields/:fieldId — изменение значения кастомного поля сделки.
export const updateLeadCustomFieldParamsSchema = z.object({
    leadId: z.coerce.number().int().positive(),
    fieldId: z.coerce.number().int().positive(),
})

export type UpdateLeadCustomFieldParams = z.infer<typeof updateLeadCustomFieldParamsSchema>

export const updateLeadCustomFieldBodySchema = z.object({
    domain: z.string(),
    value: z.any(),
})

export type UpdateLeadCustomFieldBody = z.infer<typeof updateLeadCustomFieldBodySchema>