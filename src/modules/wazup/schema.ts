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
    name: z.string().nullish(),
    avatarUri: z.string().nullish(),
    username: z.string().nullish(),
    phone: z.string().nullish(),
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
    oldText: z.string().nullish(),
    oldAuthorId: z.string().nullish(),
    oldAuthorName: z.string().nullish(),
})

const wazupQuotedMessageSchema = z.object({
    messageId: z.string().uuid().nullish(),
    channelId: z.string().uuid().nullish(),
    chatType: wazupChatTypeSchema.nullish(),
    chatId: z.string().nullish(),
    text: z.string().nullish(),
    type: wazupMessageTypeSchema.nullish(),
    authorName: z.string().nullish(),
    authorId: z.string().nullish(),
    contentUri: z.string().nullish(),
}).passthrough()

const wazupInteractiveSchema = z.record(z.string(), z.unknown())

const wazupMessageSchema = z.object({
    messageId: z.string().uuid(),
    channelId: z.string().uuid(),
    chatType: wazupChatTypeSchema,
    chatId: z.string(),
    avitoProfileId: z.string().nullish(),
    dateTime: z.string(),
    type: wazupMessageTypeSchema,
    isEcho: z.boolean(),
    contact: wazupContactSchema.nullish(),
    text: z.string().nullish(),
    contentUri: z.string().nullish(),
    status: wazupMessageStatusSchema,
    error: wazupErrorSchema.nullish(),
    authorName: z.string().nullish(),
    authorId: z.string().nullish(),
    instPost: wazupInstPostSchema.nullish(),
    interactive: z.array(wazupInteractiveSchema).nullish(),
    quotedMessage: wazupQuotedMessageSchema.nullish(),
    sentFromApp: z.boolean().nullish(),
    isEdited: z.boolean().nullish(),
    isDeleted: z.boolean().nullish(),
    oldInfo: wazupOldInfoSchema.nullish(),
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
