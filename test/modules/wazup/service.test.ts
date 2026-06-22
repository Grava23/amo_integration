import { describe, it, expect, vi, beforeEach } from "vitest"
import { WazupService } from "../../../src/modules/wazup/service.js"
import type { WazupWebhookBody } from "../../../src/modules/wazup/schema.js"

function makeIntegration() {
    return {
        domain: "test.amocrm.ru",
        accessToken: "access",
        refreshToken: "refresh",
        amojoID: "amojo",
        scopeID: "scope",
        active: true,
    }
}

function contactsWithLeads(leadIds: number[], extra: Record<string, unknown> = {}) {
    return {
        _page: 1,
        _embedded: {
            contacts: [
                { id: 10, _embedded: { leads: leadIds.map((id) => ({ id })) }, ...extra },
            ],
        },
    }
}

function lead(id: number, status_id: number, opts: Partial<{ responsible_user_id: number; custom_fields_values: any }> = {}) {
    return {
        id,
        status_id,
        responsible_user_id: opts.responsible_user_id ?? 777,
        custom_fields_values: opts.custom_fields_values,
    }
}

function whatsappBody(chatId = "79990001122"): WazupWebhookBody {
    return {
        domain: "test.amocrm.ru",
        messages: [{ chatType: "whatsapp", chatId } as any],
    }
}

describe("WazupService.handleWazupWebhook", () => {
    let repo: any
    let amoClient: any

    beforeEach(() => {
        repo = {
            getIntegrationByDomain: vi.fn().mockResolvedValue(makeIntegration()),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
            getLeadStageSettings: vi.fn().mockResolvedValue(null),
            createLeadEvent: vi.fn().mockResolvedValue(undefined),
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            contact: { getContacts: vi.fn() },
            leads: { getLead: vi.fn() },
            users: { getUserByID: vi.fn().mockResolvedValue({ name: "ИИ-продажник" }) },
        }
    })

    it("бросает, если интеграция не найдена (null)", async () => {
        repo.getIntegrationByDomain.mockResolvedValue(null)
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).rejects.toThrow("integration not found")
    })

    it("бросает, если получение интеграции упало", async () => {
        repo.getIntegrationByDomain.mockRejectedValue(new Error("db down"))
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).rejects.toThrow("get integration by domain")
    })

    it("счастливый путь whatsapp: выбирает единственную открытую сделку и собирает ответ", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1, 2]))
        amoClient.leads.getLead.mockImplementation(async (_d: string, _t: string, id: number) =>
            id === 1
                ? lead(1, 5, { responsible_user_id: 777, custom_fields_values: [{ field_name: "Город", values: [{ value: "Москва" }] }] })
                : lead(2, 142),
        )

        const svc = new WazupService(amoClient, repo)
        const result = await svc.handleWazupWebhook(whatsappBody())

        expect(result).toEqual({
            lead_id: 1,
            closed: false,
            responsible_user_name: "ИИ-продажник",
            custom_fields: [{ name: "Город", value: "Москва" }],
        })
        expect(amoClient.contact.getContacts).toHaveBeenCalledWith(
            "test.amocrm.ru", "access", { with: ["leads"], query: "79990001122" },
        )
    })

    it("пишет в журнал успешный исход (source=wazup, lead_id)", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
        amoClient.leads.getLead.mockResolvedValue(lead(1, 5))
        const svc = new WazupService(amoClient, repo)
        await svc.handleWazupWebhook(whatsappBody())
        expect(repo.createLeadEvent).toHaveBeenCalledWith(expect.objectContaining({
            domain: "test.amocrm.ru",
            source: "wazup",
            leadId: 1,
            success: true,
            error: null,
        }))
    })

    it("пишет в журнал пропуск с причиной, если у контакта нет сделок", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([]))
        const svc = new WazupService(amoClient, repo)
        await svc.handleWazupWebhook(whatsappBody())
        expect(repo.createLeadEvent).toHaveBeenCalledWith(expect.objectContaining({
            source: "wazup",
            success: false,
            error: "у контакта нет сделок",
        }))
    })

    it("пишет в журнал ошибку, если getContacts упал", async () => {
        amoClient.contact.getContacts.mockRejectedValue(new Error("amo down"))
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).rejects.toThrow()
        expect(repo.createLeadEvent).toHaveBeenCalledWith(expect.objectContaining({
            source: "wazup",
            success: false,
        }))
    })

    it("разворачивает несколько значений кастомного поля", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
        amoClient.leads.getLead.mockResolvedValue(
            lead(1, 5, { custom_fields_values: [{ field_name: "Теги", values: [{ value: "a" }, { value: "b" }] }] }),
        )
        const svc = new WazupService(amoClient, repo)
        const result = await svc.handleWazupWebhook(whatsappBody())
        expect(result?.custom_fields).toEqual([
            { name: "Теги", value: "a" },
            { name: "Теги", value: "b" },
        ])
    })

    it("пустой custom_fields, если поля отсутствуют", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
        amoClient.leads.getLead.mockResolvedValue(lead(1, 5))
        const svc = new WazupService(amoClient, repo)
        const result = await svc.handleWazupWebhook(whatsappBody())
        expect(result?.custom_fields).toEqual([])
    })

    it("при нескольких открытых без приоритетного статуса берёт первую открытую", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1, 2]))
        amoClient.leads.getLead.mockImplementation(async (_d: string, _t: string, id: number) => lead(id, 5))
        const svc = new WazupService(amoClient, repo)
        const result = await svc.handleWazupWebhook(whatsappBody())
        expect(result?.lead_id).toBe(1)
    })

    it("при нескольких открытых выбирает сделку на приоритетном статусе из настроек", async () => {
        repo.getLeadStageSettings.mockResolvedValue({
            domain: "test.amocrm.ru",
            targetStatusId: null,
            targetPipelineId: null,
            targetResponsibleUserId: null,
            priorityOpenStatusId: 9,
            commentTemplate: null,
        })
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1, 2]))
        amoClient.leads.getLead.mockImplementation(async (_d: string, _t: string, id: number) =>
            id === 2 ? lead(2, 9) : lead(1, 5),
        )
        const svc = new WazupService(amoClient, repo)
        const result = await svc.handleWazupWebhook(whatsappBody())
        expect(result?.lead_id).toBe(2)
    })

    it("приоритетный этап не задан в настройках → берёт первую открытую", async () => {
        // repo.getLeadStageSettings по умолчанию null
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1, 2]))
        amoClient.leads.getLead.mockImplementation(async (_d: string, _t: string, id: number) =>
            id === 2 ? lead(2, 9) : lead(1, 5),
        )
        const svc = new WazupService(amoClient, repo)
        const result = await svc.handleWazupWebhook(whatsappBody())
        expect(result?.lead_id).toBe(1)
    })

    it("возвращает null, если все сделки закрыты", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1, 2]))
        amoClient.leads.getLead.mockImplementation(async (_d: string, _t: string, id: number) => lead(id, id === 1 ? 142 : 143))
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).resolves.toBeNull()
    })

    it("помечает closed=true только если выбранная сделка закрыта — но закрытые отфильтрованы, поэтому null", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
        amoClient.leads.getLead.mockResolvedValue(lead(1, 143))
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).resolves.toBeNull()
    })

    it("возвращает null, если у контакта нет сделок", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([]))
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).resolves.toBeNull()
        expect(amoClient.leads.getLead).not.toHaveBeenCalled()
    })

    it("возвращает null, если контакты не найдены", async () => {
        amoClient.contact.getContacts.mockResolvedValue({ _page: 1, _embedded: { contacts: [] } })
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).resolves.toBeNull()
    })

    it("бросает, если getContacts упал", async () => {
        amoClient.contact.getContacts.mockRejectedValue(new Error("amo down"))
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).rejects.toThrow("get contacts")
    })

    it("бросает, если getLead упал", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
        amoClient.leads.getLead.mockRejectedValue(new Error("lead boom"))
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).rejects.toThrow("get lead")
    })

    it("бросает, если получение ответственного пользователя упало", async () => {
        amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
        amoClient.leads.getLead.mockResolvedValue(lead(1, 5))
        amoClient.users.getUserByID.mockRejectedValue(new Error("user boom"))
        const svc = new WazupService(amoClient, repo)
        await expect(svc.handleWazupWebhook(whatsappBody())).rejects.toThrow("get responsible user")
    })

    it("несколько контактов: предупреждает, но работает с первым", async () => {
        const many = {
            _page: 1,
            _embedded: {
                contacts: [
                    { id: 10, _embedded: { leads: [{ id: 1 }] } },
                    { id: 11, _embedded: { leads: [{ id: 2 }] } },
                ],
            },
        }
        amoClient.contact.getContacts.mockResolvedValue(many)
        amoClient.leads.getLead.mockResolvedValue(lead(1, 5))
        const svc = new WazupService(amoClient, repo)
        const result = await svc.handleWazupWebhook(whatsappBody())
        expect(result?.lead_id).toBe(1)
    })

    describe("выбор query по типу чата", () => {
        it("telegram с phone", async () => {
            amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
            amoClient.leads.getLead.mockResolvedValue(lead(1, 5))
            const svc = new WazupService(amoClient, repo)
            await svc.handleWazupWebhook({
                domain: "test.amocrm.ru",
                messages: [{ chatType: "telegram", chatId: "tg", contact: { phone: "78001234567" } } as any],
            })
            expect(amoClient.contact.getContacts).toHaveBeenCalledWith(
                "test.amocrm.ru", "access", { with: ["leads"], query: "78001234567" },
            )
        })

        it("telegram с username (без phone)", async () => {
            amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
            amoClient.leads.getLead.mockResolvedValue(lead(1, 5))
            const svc = new WazupService(amoClient, repo)
            await svc.handleWazupWebhook({
                domain: "test.amocrm.ru",
                messages: [{ chatType: "telegram", chatId: "tg", contact: { username: "@user" } } as any],
            })
            expect(amoClient.contact.getContacts).toHaveBeenCalledWith(
                "test.amocrm.ru", "access", { with: ["leads"], query: "@user" },
            )
        })

        it("telegram без contact — пропуск, null", async () => {
            const svc = new WazupService(amoClient, repo)
            const res = await svc.handleWazupWebhook({
                domain: "test.amocrm.ru",
                messages: [{ chatType: "telegram", chatId: "tg" } as any],
            })
            expect(res).toBeNull()
            expect(amoClient.contact.getContacts).not.toHaveBeenCalled()
        })

        it("max с phone", async () => {
            amoClient.contact.getContacts.mockResolvedValue(contactsWithLeads([1]))
            amoClient.leads.getLead.mockResolvedValue(lead(1, 5))
            const svc = new WazupService(amoClient, repo)
            await svc.handleWazupWebhook({
                domain: "test.amocrm.ru",
                messages: [{ chatType: "max", chatId: "max", contact: { phone: "78005553535" } } as any],
            })
            expect(amoClient.contact.getContacts).toHaveBeenCalledWith(
                "test.amocrm.ru", "access", { with: ["leads"], query: "78005553535" },
            )
        })

        it("telegram с contact без phone и username — пропуск, null", async () => {
            const svc = new WazupService(amoClient, repo)
            const res = await svc.handleWazupWebhook({
                domain: "test.amocrm.ru",
                messages: [{ chatType: "telegram", chatId: "tg", contact: { name: "Без контактов" } } as any],
            })
            expect(res).toBeNull()
            expect(amoClient.contact.getContacts).not.toHaveBeenCalled()
        })

        it("max без contact — пропуск, null", async () => {
            const svc = new WazupService(amoClient, repo)
            const res = await svc.handleWazupWebhook({
                domain: "test.amocrm.ru",
                messages: [{ chatType: "max", chatId: "max" } as any],
            })
            expect(res).toBeNull()
            expect(amoClient.contact.getContacts).not.toHaveBeenCalled()
        })

        it("max без phone — пропуск, null", async () => {
            const svc = new WazupService(amoClient, repo)
            const res = await svc.handleWazupWebhook({
                domain: "test.amocrm.ru",
                messages: [{ chatType: "max", chatId: "max", contact: { username: "u" } } as any],
            })
            expect(res).toBeNull()
        })

        it("неподдерживаемый тип чата — пропуск, null", async () => {
            const svc = new WazupService(amoClient, repo)
            const res = await svc.handleWazupWebhook({
                domain: "test.amocrm.ru",
                messages: [{ chatType: "vk", chatId: "vk" } as any],
            })
            expect(res).toBeNull()
            expect(amoClient.contact.getContacts).not.toHaveBeenCalled()
        })
    })
})
