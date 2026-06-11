import { describe, it, expect } from "vitest"
import { getContactResponseSchema } from "../../../src/infra/amo/contact.js"
import { getUserByIDResponseSchema } from "../../../src/infra/amo/users.js"

describe("экспортируемые response-схемы валидируют", () => {
    it("getUserByIDResponseSchema парсит корректного пользователя", () => {
        const user = {
            id: 1,
            name: "Менеджер",
            email: "m@example.com",
            lang: "ru",
            rights: {
                leads: { view: "A" },
                contacts: { view: "A" },
                companies: { view: "A" },
                tasks: { view: "A" },
                mail_access: true,
                catalog_access: true,
                is_admin: true,
                is_free: false,
                is_active: true,
                group_id: null,
                role_id: null,
                status_rights: [],
            },
            _links: { self: { href: "https://test.amocrm.ru/api/v4/users/1" } },
        }
        expect(() => getUserByIDResponseSchema.parse(user)).not.toThrow()
    })

    it("getContactResponseSchema парсит минимальный контакт", () => {
        const contact = {
            id: 1,
            name: "Иван",
            first_name: "Иван",
            last_name: "Иванов",
            responsible_user_id: 1,
            group_id: 0,
            created_by: 1,
            updated_by: 1,
            created_at: 1,
            updated_at: 1,
            closest_task_at: null,
            custom_fields_values: null,
            account_id: 1,
            _links: { self: { href: "https://test.amocrm.ru/api/v4/contacts/1" } },
            _embedded: {},
        }
        expect(() => getContactResponseSchema.parse(contact)).not.toThrow()
    })
})
