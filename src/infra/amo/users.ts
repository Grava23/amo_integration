import { z } from "zod"
import type { AmoClient } from "./client.js"

// ---- Request params ----
const getUserByIDParamsSchema = z.object({
    with: z.array(z.enum(["role", "group", "uuid", "amojo_id", "user_rank", "phone_number"])).optional(),
})

export type GetUserByIDParams = z.infer<typeof getUserByIDParamsSchema>

// ---- Response types ----
/** Права на сущность: ключ — действие (view, edit, …), значение — код права (A, M, D, …). */
const entityRightsSchema = z.record(z.string(), z.string())

const statusRightsItemSchema = z.object({
    entity_type: z.string(),
    pipeline_id: z.number(),
    status_id: z.number(),
    rights: z.record(z.string(), z.string()),
})

const userRightsSchema = z.object({
    leads: entityRightsSchema,
    contacts: entityRightsSchema,
    companies: entityRightsSchema,
    tasks: entityRightsSchema,
    mail_access: z.boolean(),
    catalog_access: z.boolean(),
    is_admin: z.boolean(),
    is_free: z.boolean(),
    is_active: z.boolean(),
    group_id: z.number().nullable(),
    role_id: z.number().nullable(),
    status_rights: z.array(statusRightsItemSchema),
})

export const getUserByIDResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    lang: z.enum(["ru", "en", "es"]),
    rights: userRightsSchema,
    _links: z.object({
        self: z.object({
            href: z.string().url(),
        }),
    }),
})

export type GetUserByIDResponse = z.infer<typeof getUserByIDResponseSchema>

// ---- Список пользователей (для дропдауна "ответственный") ----
const usersListItemSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string(),
})

const getUsersResponseSchema = z.object({
    _page: z.number().int().optional(),
    _embedded: z.object({
        users: z.array(usersListItemSchema),
    }),
})

export type UsersListItem = z.infer<typeof usersListItemSchema>
export type GetUsersResponse = z.infer<typeof getUsersResponseSchema>

// ---- API ----
export function createUsersAPI(client: AmoClient) {
    return {
        async getUserByID(domain: string, accessToken: string, userID: number, params: GetUserByIDParams): Promise<GetUserByIDResponse> {
            const url = new URL(`https://${domain}/api/v4/users/${userID}`)

            if (params.with) {
                url.searchParams.set("with", params.with.join(","))
            }

            const request = new Request(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                },
            })

            const response = await client.request<GetUserByIDResponse>(request)
            return response
        },

        async getUsers(domain: string, accessToken: string): Promise<GetUsersResponse> {
            const url = new URL(`https://${domain}/api/v4/users`)
            // amo отдаёт максимум 250 на страницу. Для дропдауна ответственного
            // этого достаточно; при >250 пользователях нужна пагинация.
            url.searchParams.set("limit", "250")

            const request = new Request(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                },
            })

            const response = await client.request<GetUsersResponse>(request)
            return response
        }
    }
}
