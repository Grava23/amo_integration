import { z } from "zod"
import { AmoClient } from "./client.js";

// ---- Request params ----
export const getContactListParamsSchema = z.object({
    with: z.array(z.enum(["leads", "catalog_elements", "customers"])).optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    query: z.string().or(z.number()).optional(),
})

export type GetContactListParams = z.infer<typeof getContactListParamsSchema>

const getContactParamsSchema = z.object({
    with: z.array(z.enum(["leads", "catalog_elements", "customers"])).optional(),
})

export type GetContactParams = z.infer<typeof getContactParamsSchema>

// ---- Response types ----
export const getContactListResponseSchema = z.object({
    _page: z.number(),
    _embedded: z.object({
        contacts: z.array(z.object({
            //ID контакта
            id: z.number(),
            //Название контакта
            name: z.string(),
            //Имя контакта
            first_name: z.string(),
            //Фамилия контакта
            last_name: z.string(),
            //ID пользователя, ответственного за контакт
            responsible_user_id: z.number(),
            //ID группы, в которой состоит ответственны пользователь за контакт
            group_id: z.number(),
            //ID пользователя, создавший контакт
            created_by: z.number(),
            //ID пользователя, изменивший контакт
            updated_by: z.number(),
            //Дата создания контакта, передается в Unix Timestamp
            created_at: z.number(),
            //Дата изменения контакта, передается в Unix Timestamp
            updated_at: z.number(),
            //Удален ли элемент
            is_deleted: z.boolean(),
            //Дата ближайшей задачи к выполнению, передается в Unix Timestamp
            closest_task_at: z.number(),
            //Массив, содержащий информацию по значениям дополнительных полей, заданных для данного контакта
            custom_fields_values: z.array(z.object({})),
            //ID аккаунта, в котором находится контакт
            account_id: z.number(),
            //Данные вложенных сущностей
            _embedded: z.object({
                //Данные тегов, привязанных к контакту
                tags: z.array(z.object({
                    //ID тега
                    id: z.number(),
                    //Название тега
                    name: z.string(),
                    //Цвет тега
                    color: z.string().optional(),
                })),
                //Данные компании, привязанной к контакту. В массиве всегда 1 объект
                companies: z.array(z.object({
                    //ID компании, привязанной к контакту
                    id: z.number(),
                })),
                //Требуется GET параметр with. Данные покупателей, привязанных к контакту
                customers: z.array(z.object({
                    //ID покупателя
                    id: z.number(),
                })).optional(),
                //Требуется GET параметр with. Данные сделок, привязанных к контакту
                leads: z.array(z.object({
                    //ID сделки
                    id: z.number(),
                })).optional(),
                //Требуется GET параметр with. Данные элементов списков, привязанных к контакту
                catalog_elements: z.array(z.object({
                    //ID элемента, привязанного к контакту
                    id: z.number(),
                    //Мета-данные элемента
                    metadata: z.record(z.any(), z.any()),
                    //Количество элементов у контакта
                    quantity: z.number(),
                    //ID списка, в котором находится элемент
                    catalog_id: z.number(),
                    //ID поля типа Цена, которое будет установлено для привязанного элемента в сущности
                    price_id: z.number(),
                })).optional(),
            }).optional(),
        }))
    })
})

export type GetContactListResponse = z.infer<typeof getContactListResponseSchema>

const getContactResponseSchema = z.object({
    // ID контакта
    id: z.number().int(),

    // Название контакта
    name: z.string(),

    // Имя контакта
    first_name: z.string(),

    // Фамилия контакта
    last_name: z.string(),

    // ID пользователя, ответственного за контакт
    responsible_user_id: z.number().int(),

    // ID группы, в которой состоит ответственный пользователь за контакт
    group_id: z.number().int(),

    // ID пользователя, создавший контакт
    created_by: z.number().int(),

    // ID пользователя, изменивший контакт
    updated_by: z.number().int(),

    // Дата создания контакта, Unix Timestamp (seconds)
    created_at: z.number().int(),

    // Дата изменения контакта, Unix Timestamp (seconds)
    updated_at: z.number().int(),

    // Удален ли элемент
    is_deleted: z.boolean().optional(),

    // Дата ближайшей задачи к выполнению, Unix Timestamp (seconds)
    closest_task_at: z.number().int().nullable(),

    // Массив значений дополнительных полей (может быть null)
    custom_fields_values: z.array(z.any()).nullable(),

    // ID аккаунта, в котором находится контакт
    account_id: z.number().int(),

    // Ссылки на ресурсы
    _links: z.object({
        // Ссылка на сам контакт
        self: z.object({
            // URL контакта
            href: z.string().url(),
        }),
    }),

    // Данные вложенных сущностей
    _embedded: z.object({
        // Данные тегов, привязанных к контакту
        tags: z.array(z.object({
            // ID тега
            id: z.number().int(),
            // Название тега
            name: z.string(),
            // Цвет тега (для контактов обычно null)
            color: z.null(),
        })).optional(),

        // Данные компании, привязанной к контакту (в массиве обычно 1 объект)
        companies: z.array(z.object({
            // ID компании, привязанной к контакту
            id: z.number().int(),
            // Ссылки на ресурс компании
            _links: z.object({
                // Ссылка на компанию
                self: z.object({
                    // URL компании
                    href: z.string().url(),
                }),
            }).optional(),
        })).optional(),

        // Требуется GET параметр with. Данные покупателей, привязанных к контакту
        customers: z.array(z.object({
            // ID покупателя
            id: z.number().int(),
            // Ссылки на ресурс покупателя
            _links: z.object({
                // Ссылка на покупателя
                self: z.object({
                    // URL покупателя
                    href: z.string().url(),
                }),
            }).optional(),
        })).optional(),

        // Требуется GET параметр with. Данные сделок, привязанных к контакту
        leads: z.array(z.object({
            // ID сделки
            id: z.number().int(),
            // Ссылки на ресурс сделки
            _links: z.object({
                // Ссылка на сделку
                self: z.object({
                    // URL сделки
                    href: z.string().url(),
                }),
            }).optional(),
        })).optional(),

        // Требуется GET параметр with. Данные элементов списков, привязанных к контакту
        catalog_elements: z.array(z.object({
            // ID элемента, привязанного к контакту
            id: z.number().int(),

            // Мета-данные элемента
            metadata: z.object({
                // Количество элементов у контакта (int/float)
                quantity: z.number().optional(),
                // ID списка, в котором находится элемент
                catalog_id: z.number().int().optional(),
                // ID поля типа Цена, установленного для привязанного элемента в сущности
                price_id: z.number().int().optional(),
            }).passthrough(),

            // Количество элементов у контакта (иногда приходит на верхнем уровне объекта)
            quantity: z.number().optional(),
            // ID списка (иногда приходит на верхнем уровне объекта)
            catalog_id: z.number().int().optional(),
            // ID price field (иногда приходит на верхнем уровне объекта)
            price_id: z.number().int().optional(),
        })).optional(),
    }),
})

export type GetContactResponse = z.infer<typeof getContactResponseSchema>

export { getContactResponseSchema }

// ---- API ----
export function createContactAPI(client: AmoClient) {
    return {
        async getContacts(domain: string, accessToken: string, query: GetContactListParams): Promise<GetContactListResponse> {
            const url = new URL(`https://${domain}/api/v4/contacts`)

            if (query.with) {
                url.searchParams.set("with", query.with.join(","))
            }

            if (query.page) {
                url.searchParams.set("page", query.page.toString())
            }

            if (query.limit) {
                url.searchParams.set("limit", query.limit.toString())
            }

            if (query.query) {
                url.searchParams.set("query", query.query.toString())
            }

            const request = new Request(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                },
            })

            const response = await client.request<GetContactListResponse>(request)
            return response
        },

        async getContact(domain: string, accessToken: string, id: number, query: GetContactParams): Promise<GetContactResponse> {
            const url = new URL(`https://${domain}/api/v4/contacts/${id}`)

            if (query.with) {
                url.searchParams.set("with", query.with.join(","))
            }

            const request = new Request(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                },
            })

            const response = await client.request<GetContactResponse>(request)
            return response
        }
    }
}
