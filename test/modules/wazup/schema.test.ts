import { describe, it, expect } from "vitest"
import {
    wazupWebhookBodySchema,
    wazupLeadResultSchema,
} from "../../../src/modules/wazup/schema.js"

const validMessage = {
    messageId: "11111111-1111-4111-8111-111111111111",
    channelId: "22222222-2222-4222-8222-222222222222",
    chatType: "whatsapp",
    chatId: "79990001122",
    dateTime: "2026-06-09T12:00:00Z",
    type: "text",
    isEcho: false,
    status: "inbound",
}

describe("wazupWebhookBodySchema", () => {
    it("parses a valid whatsapp message body", () => {
        const body = {
            messages: [validMessage],
            domain: "test.amocrm.ru",
        }
        expect(() => wazupWebhookBodySchema.parse(body)).not.toThrow()
        expect(wazupWebhookBodySchema.safeParse(body).success).toBe(true)
    })

    it("rejects an invalid chatType", () => {
        const body = {
            messages: [{ ...validMessage, chatType: "skype" }],
            domain: "test.amocrm.ru",
        }
        expect(wazupWebhookBodySchema.safeParse(body).success).toBe(false)
        expect(() => wazupWebhookBodySchema.parse(body)).toThrow()
    })

    it("rejects a body without domain", () => {
        const body = {
            messages: [validMessage],
        }
        expect(wazupWebhookBodySchema.safeParse(body).success).toBe(false)
        expect(() => wazupWebhookBodySchema.parse(body)).toThrow()
    })

    it("rejects a message with a non-uuid messageId", () => {
        const body = {
            messages: [{ ...validMessage, messageId: "not-a-uuid" }],
            domain: "test.amocrm.ru",
        }
        expect(wazupWebhookBodySchema.safeParse(body).success).toBe(false)
    })

    it("parses optional fields sent as null by Wazzup", () => {
        const body = {
            messages: [{
                ...validMessage,
                contact: {
                    name: "Иван Петров",
                    avatarUri: "https://store.wazzup24.com/avatar/abc123.jpg",
                    username: null,
                    phone: null,
                },
                text: "Здравствуйте!",
                contentUri: null,
                authorName: null,
                authorId: null,
                sentFromApp: false,
                isEdited: false,
                isDeleted: false,
                quotedMessage: null,
                interactive: null,
                instPost: null,
                oldInfo: null,
            }],
            domain: "shchaev93.amocrm.ru",
        }
        expect(wazupWebhookBodySchema.safeParse(body).success).toBe(true)
    })
})

describe("wazupLeadResultSchema", () => {
    it("parses a valid lead result", () => {
        const value = {
            lead_id: 12345,
            closed: false,
            responsible_user_name: "Иван Иванов",
            custom_fields: [
                { name: "Телефон", value: "79990001122" },
                { name: "Бюджет", value: 1000 },
            ],
        }
        expect(() => wazupLeadResultSchema.parse(value)).not.toThrow()
        expect(wazupLeadResultSchema.safeParse(value).success).toBe(true)
    })

    it("rejects when lead_id is not a number", () => {
        const value = {
            lead_id: "12345",
            closed: false,
            responsible_user_name: "Иван",
            custom_fields: [],
        }
        expect(wazupLeadResultSchema.safeParse(value).success).toBe(false)
    })
})
