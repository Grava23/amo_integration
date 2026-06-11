import { z } from "zod"
import { AmoClient } from "./client.js";

// ---- Request params ----
const noteOrderDirectionSchema = z.enum(["asc", "desc"])

/** GET /api/v4/{entity}/notes — query-параметры */
const getNotesParamsSchema = z.object({
    page: z.number().int().optional(),
    limit: z.number().int().min(1).max(250).optional(),
    filter: z
        .object({
            /** filter[id] — один ID или массив */
            id: z.union([z.number().int(), z.array(z.number().int())]).optional(),
            /** filter[note_type] — один тип или массив */
            note_type: z.union([z.string(), z.array(z.string())]).optional(),
            /**
             * filter[updated_at] — timestamp «после» или диапазон filter[updated_at][from]/[to]
             */
            updated_at: z
                .union([
                    z.number().int(),
                    z.object({
                        from: z.number().int().optional(),
                        to: z.number().int().optional(),
                    }),
                ])
                .optional(),
        })
        .optional(),
    /** order[updated_at], order[id] */
    order: z
        .object({
            updated_at: noteOrderDirectionSchema.optional(),
            id: noteOrderDirectionSchema.optional(),
        })
        .optional(),
    /** Поддерживается только is_pinned */
    with: z.enum(["is_pinned"]).optional(),
})

export type GetNotesParams = z.infer<typeof getNotesParamsSchema>

const addCommonNoteParamsSchema = z.object({
    text: z.string(),
})

const addCallInNoteParamsSchema = z.object({
    uniq: z.string(),
    duration: z.number().int().nonnegative(),
    source: z.string(),
    link: z.string(),
    phone: z.string(),
    /** ФИО менеджера (строка) */
    call_responsible: z.string(),
})

const addCallOutNoteParamsSchema = z.object({
    uniq: z.string(),
    duration: z.number().int().nonnegative(),
    source: z.string(),
    link: z.string(),
    phone: z.string(),
    /** ID пользователя Amo */
    call_responsible: z.number().int(),
})

const addServiceMessageNoteParamsSchema = z.object({
    service: z.string(),
    text: z.string(),
})

const messageCashierStatusSchema = z.enum(["created", "shown", "canceled"])

const addMessageCashierNoteParamsSchema = z.object({
    status: messageCashierStatusSchema,
    text: z.string(),
})

const addGeolocationNoteParamsSchema = z.object({
    text: z.string(),
    address: z.string(),
    longitude: z.string(),
    latitude: z.string(),
})

const addSmsNoteParamsSchema = z.object({
    text: z.string(),
    phone: z.string(),
})

const addAttachmentNoteParamsSchema = z.object({
    file_uuid: z.string().uuid(),
    file_name: z.string(),
    /** Необязательно — без него берётся последняя версия файла */
    version_uuid: z.string().uuid().optional(),
})

const addNoteBaseSchema = z.object({
    /**
     * Обязателен при POST /api/v4/notes (без entity_id в path).
     * Не передаётся при POST /api/v4/{entity_type}/{entity_id}/notes.
     */
    entity_id: z.number().int().optional(),
    created_by: z.number().int().optional(),
    responsible_user_id: z.number().int().optional(),
    /** Вернётся в ответе как есть, в Amo не сохраняется */
    request_id: z.string().optional(),
    is_need_to_trigger_digital_pipeline: z.boolean().optional(),
})

const addCommonNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("common"),
    params: addCommonNoteParamsSchema,
})

const addCallInNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("call_in"),
    params: addCallInNoteParamsSchema,
})

const addCallOutNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("call_out"),
    params: addCallOutNoteParamsSchema,
})

const addServiceMessageNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("service_message"),
    params: addServiceMessageNoteParamsSchema,
})

const addExtendedServiceMessageNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("extended_service_message"),
    params: addServiceMessageNoteParamsSchema,
})

const addMessageCashierNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("message_cashier"),
    params: addMessageCashierNoteParamsSchema,
})

const addGeolocationNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("geolocation"),
    params: addGeolocationNoteParamsSchema,
})

const addSmsInNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("sms_in"),
    params: addSmsNoteParamsSchema,
})

const addSmsOutNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("sms_out"),
    params: addSmsNoteParamsSchema,
})

const addAttachmentNoteSchema = addNoteBaseSchema.extend({
    note_type: z.literal("attachment"),
    params: addAttachmentNoteParamsSchema,
})

/** Один элемент тела POST (массив таких объектов) */
export const addNoteSchema = z.discriminatedUnion("note_type", [
    addCommonNoteSchema,
    addCallInNoteSchema,
    addCallOutNoteSchema,
    addServiceMessageNoteSchema,
    addExtendedServiceMessageNoteSchema,
    addMessageCashierNoteSchema,
    addGeolocationNoteSchema,
    addSmsInNoteSchema,
    addSmsOutNoteSchema,
    addAttachmentNoteSchema,
])

/** POST /api/v4/.../notes — тело запроса */
export const addNotesBodySchema = z.array(addNoteSchema).min(1)

export type AddNote = z.infer<typeof addNoteSchema>
export type AddNotesBody = z.infer<typeof addNotesBodySchema>

// ---- Response types ----
const hrefLinkSchema = z.object({
    href: z.string(),
})

/**
 * params для note_type === "call_in".
 * `call_responsible` — уже ФИО менеджера (строка), отдельный запрос пользователя не нужен.
 */
const callInParamsSchema = z.object({
    uniq: z.string(),
    duration: z.number().int(),
    source: z.string(),
    link: z.string(),
    phone: z.string(),
    call_responsible: z.string(),
})

/**
 * params для note_type === "call_out".
 * `call_responsible` — ID пользователя Amo; имя берётся через GET /api/v4/users/{id}.
 * coerce — на случай строки в JSON ("504141").
 */
const callOutParamsSchema = z.object({
    uniq: z.string(),
    duration: z.number().int(),
    source: z.string(),
    link: z.string(),
    phone: z.string(),
    call_responsible: z.coerce.number().int(),
})

const amoCallNoteItemBaseSchema = z.object({
    id: z.number().int(),
    entity_id: z.number().int(),
    created_by: z.number().int(),
    updated_by: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
    responsible_user_id: z.number().int(),
    group_id: z.number().int(),
    account_id: z.number().int(),
    /** Требуется GET-параметр with=is_pinned */
    is_pinned: z.boolean().optional(),
    _links: z.object({
        self: hrefLinkSchema,
    }),
})

const callInNoteItemSchema = amoCallNoteItemBaseSchema.extend({
    note_type: z.literal("call_in"),
    params: callInParamsSchema,
})

const callOutNoteItemSchema = amoCallNoteItemBaseSchema.extend({
    note_type: z.literal("call_out"),
    params: callOutParamsSchema,
})

/** Только примечания со звонками: call_in | call_out */
const callNoteItemSchema = z.discriminatedUnion("note_type", [
    callInNoteItemSchema,
    callOutNoteItemSchema,
])

const getCallNotesResponseSchema = z.object({
    _page: z.number().int(),
    _links: z.object({
        self: hrefLinkSchema,
        next: hrefLinkSchema.optional(),
    }),
    _embedded: z.object({
        notes: z.array(callNoteItemSchema),
    }),
})

export type GetCallNotesResponse = z.infer<typeof getCallNotesResponseSchema>
export type AmoCallNoteItem = z.infer<typeof callNoteItemSchema>
export type AmoCallInNoteItem = z.infer<typeof callInNoteItemSchema>
export type AmoCallOutNoteItem = z.infer<typeof callOutNoteItemSchema>

/** Элемент коллекции в ответе POST /api/v4/.../notes */
const addNoteCreatedItemSchema = z.object({
    id: z.number().int(),
    entity_id: z.number().int(),
    /** Переданный request_id или порядковый индекс ("0", "1", …) */
    request_id: z.string(),
    _links: z.object({
        self: hrefLinkSchema,
    }),
})

const addNotesResponseSchema = z.object({
    _links: z.object({
        self: hrefLinkSchema,
    }),
    _embedded: z.object({
        notes: z.array(addNoteCreatedItemSchema),
    }),
})

export type AddNoteCreatedItem = z.infer<typeof addNoteCreatedItemSchema>
export type AddNotesResponse = z.infer<typeof addNotesResponseSchema>

export {
    getCallNotesResponseSchema,
    callNoteItemSchema,
    callInParamsSchema,
    callOutParamsSchema,
    callInNoteItemSchema,
    callOutNoteItemSchema,
    addNotesResponseSchema,
    addNoteCreatedItemSchema,
}

// ---- API ----
export function createNotesAPI(client: AmoClient) {
    return {
        async getNotesByEntityTypeAndID(domain: string, accessToken: string, entityType: string, entityID: number, query: GetNotesParams): Promise<GetCallNotesResponse> {
            const url = new URL(`https://${domain}/api/v4/${entityType}/${entityID}/notes`)

            if (query.page) {
                url.searchParams.set("page", query.page.toString())
            }

            if (query.limit) {
                url.searchParams.set("limit", query.limit.toString())
            }

            if (query.filter?.id) {
                if (Array.isArray(query.filter.id)) {
                    url.searchParams.set("filter[id]", query.filter.id.join(","))
                } else {
                    url.searchParams.set("filter[id]", query.filter.id.toString())
                }
            }

            if (query.filter?.note_type) {
                if (Array.isArray(query.filter.note_type)) {
                    url.searchParams.set("filter[note_type]", query.filter.note_type.join(","))
                } else {
                    url.searchParams.set("filter[note_type]", query.filter.note_type.toString())
                }
            }

            if (query.filter?.updated_at) {
                if (typeof query.filter.updated_at === "number") {
                    url.searchParams.set("filter[updated_at]", query.filter.updated_at.toString())
                } else {
                    url.searchParams.set("filter[updated_at][from]", query.filter.updated_at.from?.toString() ?? "")
                    url.searchParams.set("filter[updated_at][to]", query.filter.updated_at.to?.toString() ?? "")
                }
            }

            if (query.order) {
                if (query.order.updated_at) {
                    url.searchParams.set("order[updated_at]", query.order.updated_at)
                }
                if (query.order.id) {
                    url.searchParams.set("order[id]", query.order.id)
                }
            }

            if (query.with) {
                url.searchParams.set("with", query.with.toString())
            }

            const request = new Request(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                },
            })

            const response = await client.request<GetCallNotesResponse>(request)
            return response
        },

        async addNotesByEntityTypeAndID(domain: string, accessToken: string, entityType: string, entityID: number, body: AddNotesBody) {
            const url = new URL(`https://${domain}/api/v4/${entityType}/${entityID}/notes`)

            const request = new Request(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            })

            const response = await client.request<AddNotesResponse>(request)
            return response
        }
    }
}
