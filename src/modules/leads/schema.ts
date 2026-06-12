import { z } from "zod"

export const leadResultSchema = z.object({
    lead_id: z.number(),
    closed: z.boolean(),
    responsible_user_name: z.string(),
    custom_fields: z.array(z.object({
        name: z.string(),
        value: z.any(),
    })),
})

export type LeadResult = z.infer<typeof leadResultSchema>

export const findLeadQuerySchema = z.object({
    domain: z.string(),
    phone: z.string().optional(),
    username: z.string().optional(),
}).refine((data) => data.phone || data.username, {
    message: "phone or username is required",
})

export type FindLeadQuery = z.infer<typeof findLeadQuerySchema>

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
