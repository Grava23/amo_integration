import { z } from "zod"
import { AmoClient } from "./client.js"

// ---- Request params ----
const getLeadsParamsSchema = z.object({
    with: z.array(z.enum(["catalog_elements", "is_price_modified_by_robot", "loss_reason", "contacts", "only_deleted", "source_id", "source"])).optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
    query: z.string().or(z.number()).optional(),
})

export type GetLeadsParams = z.infer<typeof getLeadsParamsSchema>

const getLeadParamsSchema = z.object({
    with: z.array(z.enum(["catalog_elements", "is_price_modified_by_robot", "loss_reason", "contacts", "only_deleted", "source_id", "source"])).optional(),
})

export type GetLeadParams = z.infer<typeof getLeadParamsSchema>

// ---- Update (PATCH) request body ----
const updateLeadBodySchema = z.object({
    // ID этапа (статуса), в который переводим сделку
    status_id: z.number().int().optional(),
    // ID воронки этапа (нужен, если этап в другой воронке)
    pipeline_id: z.number().int().optional(),
    // ID нового ответственного пользователя
    responsible_user_id: z.number().int().optional(),
    // Значения дополнительных полей (напр. «время старта ИИ»)
    custom_fields_values: z.array(z.object({
        field_id: z.number().int(),
        values: z.array(z.object({
            value: z.any(),
        })),
    })).optional(),
})

export type UpdateLeadBody = z.infer<typeof updateLeadBodySchema>

// ---- Response types ----
const getLeadsResponseSchema = z.object({
    _page: z.number(),
    _embedded: z.object({
        leads: z.array(z.object({
            //ID сделки
            id: z.number(),
            //Название сделки
            name: z.string(),
            //Бюджет сделки
            price: z.number(),
            //ID пользователя, ответственного за сделку
            responsible_user_id: z.number(),
            //ID группы, в которой состоит ответственны пользователь за сделку
            group_id: z.number(),
            //ID статуса, в который добавляется сделка, по-умолчанию – первый этап главной воронки
            status_id: z.number(),
            //ID воронки, в которую добавляется сделка
            pipeline_id: z.number(),
            //ID причины отказа
            loss_reason_id: z.number(),
            //ID источника сделки
            source_id: z.number(),
            //ID пользователя, создающий сделку
            created_by: z.number(),
            //ID пользователя, изменяющий сделку
            updated_by: z.number(),
            //Дата закрытия сделки, передается в Unix Timestamp
            closed_at: z.number(),
            //Дата создания сделки, передается в Unix Timestamp
            created_at: z.number(),
            //Дата изменения сделки, передается в Unix Timestamp
            updated_at: z.number(),
            //Дата ближайшей задачи к выполнению, передается в Unix Timestamp
            closest_task_at: z.number(),
            //Удалена ли сделка
            is_deleted: z.boolean(),
            //Массив, содержащий информацию по значениям дополнительных полей, заданных для данной сделки
            custom_fields_values: z.array(z.object({
                field_id: z.number(),
                field_name: z.string(),
                field_code: z.string().optional(),
                field_type: z.string(),
                values: z.array(z.object({
                    value: z.any(),
                }))
            })).optional(),
            //Скоринг сделки
            score: z.number().optional(),
            //ID аккаунта, в котором находится сделка
            account_id: z.number(),
            //Тип поля "стоимость труда" показывает сколько времени было затрачено на работу со сделкой. Время исчисления в секундах
            labor_cost: z.number(),
            //Требуется GET параметр with. Изменен ли в последний раз бюджет сделки роботом
            is_price_modified_by_robot: z.boolean().optional(),
            //Данные вложенных сущностей
            _embedded: z.object({
                //Требуется GET параметр with. Причина отказа сделки
                loss_reason: z.object({
                    //ID причины отказа
                    id: z.number(),
                    //Название причины отказа
                    name: z.string(),
                }),
                //Данные тегов, привязанных к сделке
                tags: z.array(z.object({
                    //ID тега
                    id: z.number(),
                    //Название тега
                    name: z.string(),
                    //Цвет тега
                    color: z.string().optional(),
                })),
                //Требуется GET параметр with. Данные контактов, привязанных к сделке
                contacts: z.array(z.object({
                    //ID контакта, привязанного к сделке
                    id: z.number(),
                    //Является ли контакт главным для сделки
                    is_main: z.boolean(),
                })),
                //Данные компании, привязанной к сделке, в данном массиве всегда 1 элемент, так как у сделки может быть только 1 компания
                companies: z.array(z.object({
                    //ID компании, привязанной к сделке
                    id: z.number(),
                })),
                //Требуется GET параметр with. Данные элементов списков, привязанных к сделке
                catalog_elements: z.array(z.object({
                    //ID элемента, привязанного к сделке
                    id: z.number(),
                    //Мета-данные элемента
                    metadata: z.record(z.string(), z.any()),
                    //Количество элементов у сделки
                    quantity: z.number(),
                    //ID списка, в котором находится элемент
                    catalog_id: z.number(),
                    //ID поля типа Цена, которое будет установлено для привязанного элемента в сущности
                    price_id: z.number(),
                })),
                //Требуется GET параметр with. Источник сделки
                source: z.object({
                    //ID источника
                    id: z.number(),
                    //Название источника
                    name: z.string(),
                }),
            })
        }))
    })
})

export type GetLeadsResponse = z.infer<typeof getLeadsResponseSchema>

const getLeadResponseSchema = z.object({
    // ID сделки
    id: z.number().int(),

    // Название сделки
    name: z.string(),

    // Бюджет сделки
    price: z.number().int(),

    // ID пользователя, ответственного за сделку
    responsible_user_id: z.number().int(),

    // ID группы, в которой состоит ответственный пользователь за сделку
    group_id: z.number().int(),

    // ID статуса, в который добавляется сделка
    status_id: z.number().int(),

    // ID воронки, в которую добавляется сделка
    pipeline_id: z.number().int(),

    // ID причины отказа
    loss_reason_id: z.number().int(),

    // Требуется GET параметр with. ID источника сделки
    source_id: z.number().int().nullable(),

    // ID пользователя, создающий сделку
    created_by: z.number().int(),

    // ID пользователя, изменяющий сделку
    updated_by: z.number().int(),

    // Дата закрытия сделки, Unix Timestamp (seconds)
    closed_at: z.number().int(),

    // Дата создания сделки, Unix Timestamp (seconds)
    created_at: z.number().int(),

    // Дата изменения сделки, Unix Timestamp (seconds)
    updated_at: z.number().int(),

    // Дата ближайшей задачи к выполнению, Unix Timestamp (seconds)
    closest_task_at: z.number().int().nullable(),

    // Удалена ли сделка
    is_deleted: z.boolean(),

    // Массив значений дополнительных полей (может быть null)
    custom_fields_values: z.array(z.object({
        field_id: z.number(),
        field_name: z.string(),
        field_code: z.string().optional(),
        field_type: z.string(),
        values: z.array(z.object({
            value: z.any(),
        }))
    })).optional(),

    // Скоринг сделки (может быть null)
    score: z.number().int().nullable(),

    // ID аккаунта, в котором находится сделка
    account_id: z.number().int(),

    // Стоимость труда (секунды), сколько времени затрачено на работу со сделкой
    labor_cost: z.number().int().optional(),

    // Требуется GET параметр with. Изменен ли в последний раз бюджет сделки роботом
    is_price_modified_by_robot: z.boolean(),

    // Ссылки на ресурсы
    _links: z.object({
        // Ссылка на саму сделку
        self: z.object({
            // URL сделки
            href: z.string().url(),
        }),
    }),

    // Данные вложенных сущностей
    _embedded: z.object({
        // Данные тегов, привязанных к сделке
        tags: z.array(z.object({
            // ID тега
            id: z.number().int(),
            // Название тега
            name: z.string(),
            // Цвет тега (может быть null)
            color: z.string().nullable(),
        })).optional(),

        // Требуется GET параметр with. Данные элементов списков, привязанных к сделке
        catalog_elements: z.array(z.object({
            // ID элемента, привязанного к сделке
            id: z.number().int(),
            // Мета-данные элемента
            metadata: z.object({
                // Количество элементов у сделки (int/float)
                quantity: z.number().optional(),
                // ID списка, в котором находится элемент
                catalog_id: z.number().int().optional(),
                // ID поля типа Цена, установленного для привязанного элемента в сущности
                price_id: z.number().int().optional(),
            }).passthrough(),

            // Количество элементов у сделки (иногда приходит на верхнем уровне объекта)
            quantity: z.number().optional(),
            // ID списка (иногда приходит на верхнем уровне объекта)
            catalog_id: z.number().int().optional(),
            // ID price field (иногда приходит на верхнем уровне объекта)
            price_id: z.number().int().optional(),
        })).optional(),

        // Требуется GET параметр with. Причина отказа сделки
        loss_reason: z.array(z.object({
            // ID причины отказа
            id: z.number().int(),
            // Название причины отказа
            name: z.string(),
            // Сортировка (встречается в ответе)
            sort: z.number().int().optional(),
            // Дата создания, Unix Timestamp (seconds)
            created_at: z.number().int().optional(),
            // Дата изменения, Unix Timestamp (seconds)
            updated_at: z.number().int().optional(),
            // Ссылки на ресурс причины отказа
            _links: z.object({
                // Ссылка на причину отказа
                self: z.object({
                    // URL причины отказа
                    href: z.string().url(),
                }),
            }).optional(),
        })).optional(),

        // Данные компании, привязанной к сделке (обычно 1 элемент)
        companies: z.array(z.object({
            // ID компании, привязанной к сделке
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

        // Требуется GET параметр with. Данные контактов, привязанных к сделке
        contacts: z.array(z.object({
            // ID контакта, привязанного к сделке
            id: z.number().int(),
            // Является ли контакт главным для сделки
            is_main: z.boolean(),
            // Ссылки на ресурс контакта
            _links: z.object({
                // Ссылка на контакт
                self: z.object({
                    // URL контакта
                    href: z.string().url(),
                }),
            }).optional(),
        })).optional(),

        // Требуется GET параметр with. Источник сделки
        source: z.object({
            // ID источника сделки
            id: z.number().int(),
            // Название источника сделки
            name: z.string(),
        }).optional(),
    }),
})

export type GetLeadResponse = z.infer<typeof getLeadResponseSchema>

// ---- Update (PATCH) response ----
const updateLeadResponseSchema = z.object({
    // ID сделки
    id: z.number().int(),
    // ID этапа (статуса) после обновления
    status_id: z.number().int(),
    // ID воронки после обновления
    pipeline_id: z.number().int(),
    // ID ответственного после обновления
    responsible_user_id: z.number().int(),
    // Дата изменения сделки, Unix Timestamp (seconds)
    updated_at: z.number().int(),
    // Ссылки на ресурс
    _links: z.object({
        self: z.object({
            href: z.string().url(),
        }),
    }),
})

export type UpdateLeadResponse = z.infer<typeof updateLeadResponseSchema>

// ---- Pipelines (этапы для дропдаунов) ----
const pipelineStatusSchema = z.object({
    // ID этапа (статуса)
    id: z.number().int(),
    // Название этапа
    name: z.string(),
    // Сортировка
    sort: z.number().int(),
    // ID воронки, которой принадлежит этап
    pipeline_id: z.number().int(),
    // Цвет этапа
    color: z.string().nullable().optional(),
    // Тип этапа (1 — успешно реализовано, и т.п.)
    type: z.number().int().optional(),
})

const pipelineSchema = z.object({
    // ID воронки
    id: z.number().int(),
    // Название воронки
    name: z.string(),
    // Сортировка
    sort: z.number().int(),
    // Главная ли воронка
    is_main: z.boolean(),
    // Этапы воронки
    _embedded: z.object({
        statuses: z.array(pipelineStatusSchema),
    }),
})

const getPipelinesResponseSchema = z.object({
    _embedded: z.object({
        pipelines: z.array(pipelineSchema),
    }),
})

export type PipelineStatus = z.infer<typeof pipelineStatusSchema>
export type Pipeline = z.infer<typeof pipelineSchema>
export type GetPipelinesResponse = z.infer<typeof getPipelinesResponseSchema>

// ---- API ----
export function createLeadAPI(client: AmoClient) {
    return {
        async getLeads(domain: string, accessToken: string, query: GetLeadsParams): Promise<GetLeadsResponse> {
            const url = new URL(`https://${domain}/api/v4/leads`)

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

            const response = await client.request<GetLeadsResponse>(request)
            return response
        },

        async getLead(domain: string, accessToken: string, id: number, query: GetLeadParams): Promise<GetLeadResponse> {
            const url = new URL(`https://${domain}/api/v4/leads/${id}`)

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

            const response = await client.request<GetLeadResponse>(request)
            return response
        },

        async updateLead(domain: string, accessToken: string, id: number, body: UpdateLeadBody): Promise<UpdateLeadResponse> {
            const url = new URL(`https://${domain}/api/v4/leads/${id}`)

            const request = new Request(url, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            })

            const response = await client.request<UpdateLeadResponse>(request)
            return response
        },

        async getPipelines(domain: string, accessToken: string): Promise<GetPipelinesResponse> {
            const url = new URL(`https://${domain}/api/v4/leads/pipelines`)

            const request = new Request(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                },
            })

            const response = await client.request<GetPipelinesResponse>(request)
            return response
        }
    }
}
