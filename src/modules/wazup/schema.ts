import { z } from "zod"

const wazupChatTypeSchema = z.enum([
    "whatsapp",
    "whatsgroup",
    "viber",
    "instagram",
    "instacomment",
    "telegram",
    "telegroup",
    "vk",
    "avito",
    "max",
    "maxgroup",
])

const wazupMessageTypeSchema = z.enum([
    "text",
    "image",
    "audio",
    "video",
    "document",
    "vcard",
    "geo",
    "wapi_template",
    "unsupported",
    "missing_call",
    "unknown",
])

const wazupMessageStatusSchema = z.enum([
    "sent",
    "delivered",
    "read",
    "error",
    "inbound",
])

const wazupContactSchema = z.object({
    name: z.string().optional(),
    avatarUri: z.string().optional(),
    username: z.string().optional(),
    phone: z.string().optional(),
})

const wazupErrorSchema = z.object({
    error: z.string(),
    description: z.string(),
})

const wazupInstPostSchema = z.object({
    id: z.string(),
    src: z.string(),
    author: z.string(),
    description: z.string(),
})

const wazupOldInfoSchema = z.object({
    oldText: z.string().optional(),
    oldAuthorId: z.string().optional(),
    oldAuthorName: z.string().optional(),
})

const wazupQuotedMessageSchema = z.object({
    messageId: z.string().uuid().optional(),
    channelId: z.string().uuid().optional(),
    chatType: wazupChatTypeSchema.optional(),
    chatId: z.string().optional(),
    text: z.string().optional(),
    type: wazupMessageTypeSchema.optional(),
    authorName: z.string().optional(),
    authorId: z.string().optional(),
    contentUri: z.string().optional(),
}).passthrough()

const wazupInteractiveSchema = z.record(z.string(), z.unknown())

const wazupMessageSchema = z.object({
    messageId: z.string().uuid(),
    channelId: z.string().uuid(),
    chatType: wazupChatTypeSchema,
    chatId: z.string(),
    avitoProfileId: z.string().optional(),
    dateTime: z.string(),
    type: wazupMessageTypeSchema,
    isEcho: z.boolean(),
    contact: wazupContactSchema.optional(),
    text: z.string().optional(),
    contentUri: z.string().optional(),
    status: wazupMessageStatusSchema,
    error: wazupErrorSchema.optional(),
    authorName: z.string().optional(),
    authorId: z.string().optional(),
    instPost: wazupInstPostSchema.optional(),
    interactive: z.array(wazupInteractiveSchema).optional(),
    quotedMessage: wazupQuotedMessageSchema.optional(),
    sentFromApp: z.boolean().optional(),
    isEdited: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    oldInfo: wazupOldInfoSchema.optional(),
})

export const wazupWebhookBodySchema = z.object({
    messages: z.array(wazupMessageSchema),
    domain: z.string(),
})

/** Ответ на вебхук — данные сделки, подобранной по контакту из сообщения */
export const wazupLeadResultSchema = z.object({
    lead_id: z.number(),
    closed: z.boolean(),
    responsible_user_name: z.string(),
    custom_fields: z.array(z.object({
        name: z.string(),
        value: z.any(),
    })),
})

export type WazupLeadResult = z.infer<typeof wazupLeadResultSchema>

export type WazupChatType = z.infer<typeof wazupChatTypeSchema>
export type WazupMessageType = z.infer<typeof wazupMessageTypeSchema>
export type WazupMessageStatus = z.infer<typeof wazupMessageStatusSchema>
export type WazupContact = z.infer<typeof wazupContactSchema>
export type WazupError = z.infer<typeof wazupErrorSchema>
export type WazupInstPost = z.infer<typeof wazupInstPostSchema>
export type WazupOldInfo = z.infer<typeof wazupOldInfoSchema>
export type WazupQuotedMessage = z.infer<typeof wazupQuotedMessageSchema>
export type WazupMessage = z.infer<typeof wazupMessageSchema>
export type WazupWebhookBody = z.infer<typeof wazupWebhookBodySchema>
