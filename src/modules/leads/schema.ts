import { z } from "zod"

export const addLeadCommentParamsSchema = z.object({
    leadId: z.coerce.number().int().positive(),
})

export type AddLeadCommentParams = z.infer<typeof addLeadCommentParamsSchema>

export const addLeadCommentBodySchema = z.object({
    domain: z.string(),
    text: z.string().min(1),
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
