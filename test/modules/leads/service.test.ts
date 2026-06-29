import { describe, it, expect, vi, beforeEach } from "vitest"
import { ConfigError, LeadsService } from "../../../src/modules/leads/service.js"

function makeIntegration(overrides: Record<string, unknown> = {}) {
    return {
        domain: "test.amocrm.ru",
        accessToken: "access",
        refreshToken: "refresh",
        amojoID: "amojo",
        scopeID: "scope",
        active: true,
        amoApiToken: null,
        ...overrides,
    }
}

// Полные настройки ИИ-воронки (все ID заданы); поля можно переопределить.
function makeAiSettings(overrides: Record<string, unknown> = {}) {
    return {
        domain: "test.amocrm.ru",
        targetStatusId: null,
        targetPipelineId: null,
        targetResponsibleUserId: null,
        priorityOpenStatusId: null,
        commentTemplate: null,
        aiPipelineId: 11015426,
        aiTriggerStatusId: 86573138,
        aiResponsibleUserId: 11169598,
        aiStartTimeFieldId: 1320673,
        autoblockStatusId: 86573146,
        handoffStatusId: 86573142,
        successStatusId: 142,
        ...overrides,
    }
}

// Сделка, по умолчанию открытая и на этапе-триггере ИИ.
function makeLead(overrides: Record<string, unknown> = {}) {
    return {
        id: 100,
        status_id: 86573138,
        pipeline_id: 11015426,
        responsible_user_id: 777,
        closed_at: 0,
        custom_fields_values: [],
        ...overrides,
    }
}

describe("LeadsService.addComment", () => {
    let repo: any
    let amoClient: any

    beforeEach(() => {
        repo = {
            getIntegrationByDomain: vi.fn().mockResolvedValue(makeIntegration()),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
            getLeadStageSettings: vi.fn().mockResolvedValue(null),
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            notes: { addNotesByEntityTypeAndID: vi.fn().mockResolvedValue({ ok: true }) },
            leads: { updateLead: vi.fn().mockResolvedValue({ id: 42, status_id: 142 }) },
        }
    })

    it("успех: добавляет common-заметку и возвращает результат", async () => {
        const svc = new LeadsService(amoClient, repo)

        const result = await svc.addComment("test.amocrm.ru", 42, "hello")

        expect(result).toEqual({ ok: true })
        expect(amoClient.notes.addNotesByEntityTypeAndID).toHaveBeenCalledWith(
            "test.amocrm.ru",
            "access",
            "leads",
            42,
            [{ note_type: "common", params: { text: "hello" } }],
        )
    })

    it("без text берёт шаблон из настроек домена", async () => {
        repo.getLeadStageSettings.mockResolvedValue({
            domain: "test.amocrm.ru",
            targetStatusId: null,
            targetPipelineId: null,
            targetResponsibleUserId: null,
            priorityOpenStatusId: null,
            commentTemplate: "Обработано ассистентом",
        })
        const svc = new LeadsService(amoClient, repo)

        await svc.addComment("test.amocrm.ru", 42)

        expect(amoClient.notes.addNotesByEntityTypeAndID).toHaveBeenCalledWith(
            "test.amocrm.ru", "access", "leads", 42,
            [{ note_type: "common", params: { text: "Обработано ассистентом" } }],
        )
    })

    it("бросает, если нет ни text, ни шаблона", async () => {
        const svc = new LeadsService(amoClient, repo) // getLeadStageSettings → null
        await expect(svc.addComment("test.amocrm.ru", 42))
            .rejects.toThrow("no comment_template configured")
        expect(amoClient.notes.addNotesByEntityTypeAndID).not.toHaveBeenCalled()
    })

    it("бросает 'get integration by domain', если получение интеграции упало", async () => {
        repo.getIntegrationByDomain.mockRejectedValue(new Error("db down"))
        const svc = new LeadsService(amoClient, repo)

        await expect(svc.addComment("test.amocrm.ru", 42, "hello"))
            .rejects.toThrow("get integration by domain")
        expect(amoClient.notes.addNotesByEntityTypeAndID).not.toHaveBeenCalled()
    })

    it("бросает 'add note', если добавление заметки упало", async () => {
        amoClient.notes.addNotesByEntityTypeAndID.mockRejectedValue(new Error("note boom"))
        const svc = new LeadsService(amoClient, repo)

        await expect(svc.addComment("test.amocrm.ru", 42, "hello"))
            .rejects.toThrow("add note")
    })
})

describe("LeadsService.changeStageAndResponsible", () => {
    let repo: any
    let amoClient: any

    beforeEach(() => {
        repo = {
            getIntegrationByDomain: vi.fn().mockResolvedValue(makeIntegration()),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
            getLeadStageSettings: vi.fn().mockResolvedValue({
                domain: "test.amocrm.ru",
                targetStatusId: 142,
                targetPipelineId: null,
                targetResponsibleUserId: 99,
                priorityOpenStatusId: null,
                commentTemplate: null,
            }),
            createStageEvent: vi.fn().mockResolvedValue(undefined),
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            leads: { updateLead: vi.fn().mockResolvedValue({ id: 42, status_id: 142 }) },
        }
    })

    it("успех: патчит сделку этапом/ответственным из настроек домена", async () => {
        const svc = new LeadsService(amoClient, repo)

        const result = await svc.changeStageAndResponsible("test.amocrm.ru", 42)

        expect(result).toEqual({ id: 42, status_id: 142 })
        expect(amoClient.leads.updateLead).toHaveBeenCalledWith(
            "test.amocrm.ru",
            "access",
            42,
            // targetPipelineId = null → pipeline_id в тело не попадает
            { status_id: 142, responsible_user_id: 99 },
        )
    })

    it("пишет успешное событие в журнал", async () => {
        const svc = new LeadsService(amoClient, repo)
        await svc.changeStageAndResponsible("test.amocrm.ru", 42)
        expect(repo.createStageEvent).toHaveBeenCalledWith(expect.objectContaining({
            domain: "test.amocrm.ru",
            leadId: 42,
            statusId: 142,
            responsibleUserId: 99,
            success: true,
            error: null,
        }))
    })

    it("пишет событие с ошибкой, если updateLead упал", async () => {
        amoClient.leads.updateLead.mockRejectedValue(new Error("patch boom"))
        const svc = new LeadsService(amoClient, repo)
        await expect(svc.changeStageAndResponsible("test.amocrm.ru", 42)).rejects.toThrow()
        expect(repo.createStageEvent).toHaveBeenCalledWith(expect.objectContaining({
            leadId: 42,
            success: false,
        }))
    })

    it("кладёт в тело только заданные поля (pipeline_id когда есть)", async () => {
        repo.getLeadStageSettings.mockResolvedValue({
            domain: "test.amocrm.ru",
            targetStatusId: 200,
            targetPipelineId: 777,
            targetResponsibleUserId: null,
        })
        const svc = new LeadsService(amoClient, repo)

        await svc.changeStageAndResponsible("test.amocrm.ru", 42)

        expect(amoClient.leads.updateLead).toHaveBeenCalledWith(
            "test.amocrm.ru",
            "access",
            42,
            { status_id: 200, pipeline_id: 777 },
        )
    })

    it("бросает 'settings not configured', если настроек нет", async () => {
        repo.getLeadStageSettings.mockResolvedValue(null)
        const svc = new LeadsService(amoClient, repo)

        await expect(svc.changeStageAndResponsible("test.amocrm.ru", 42))
            .rejects.toThrow("settings not configured")
        expect(amoClient.leads.updateLead).not.toHaveBeenCalled()
    })

    it("бросает 'get integration by domain', если получение интеграции упало", async () => {
        repo.getIntegrationByDomain.mockRejectedValue(new Error("db down"))
        const svc = new LeadsService(amoClient, repo)

        await expect(svc.changeStageAndResponsible("test.amocrm.ru", 42))
            .rejects.toThrow("get integration by domain")
        expect(amoClient.leads.updateLead).not.toHaveBeenCalled()
    })

    it("бросает 'update lead', если обновление сделки упало", async () => {
        amoClient.leads.updateLead.mockRejectedValue(new Error("patch boom"))
        const svc = new LeadsService(amoClient, repo)

        await expect(svc.changeStageAndResponsible("test.amocrm.ru", 42))
            .rejects.toThrow("update lead")
    })
})

describe("LeadsService.resolveLead", () => {
    let repo: any
    let amoClient: any

    beforeEach(() => {
        repo = {
            getIntegrationByDomain: vi.fn().mockResolvedValue(makeIntegration()),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
            getLeadStageSettings: vi.fn().mockResolvedValue(makeAiSettings()),
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            contact: {
                getContacts: vi.fn().mockResolvedValue({
                    _embedded: { contacts: [{ id: 1, _embedded: { leads: [{ id: 100 }] } }] },
                }),
            },
            leads: {
                getLead: vi.fn().mockResolvedValue(makeLead()),
                updateLead: vi.fn().mockResolvedValue({ id: 100, status_id: 86573138 }),
            },
            users: { getUserByID: vi.fn() },
        }
    })

    it("находит открытую сделку, гейт should_engage_ai=true и проставляет время старта ИИ", async () => {
        const svc = new LeadsService(amoClient, repo)

        const result = await svc.resolveLead("test.amocrm.ru", { chatType: "whatsapp", chatId: "79990001122" })

        expect(result).toMatchObject({
            found: true,
            lead_id: 100,
            pipeline_id: 11015426,
            status_id: 86573138,
            closed: false,
            responsible_user_id: 777,
            should_engage_ai: true,
            ai_start_set: true,
        })
        // под капотом проставлено кастом-поле «время старта ИИ»
        expect(amoClient.leads.updateLead).toHaveBeenCalledTimes(1)
        const [, , leadId, body] = amoClient.leads.updateLead.mock.calls[0]
        expect(leadId).toBe(100)
        expect(body.custom_fields_values[0].field_id).toBe(1320673)
        expect(typeof body.custom_fields_values[0].values[0].value).toBe("number")
    })

    it("возвращает сделку, если не удалось проставить время старта ИИ", async () => {
        amoClient.leads.updateLead.mockRejectedValue(new Error("Not enough rights"))
        const svc = new LeadsService(amoClient, repo)

        const result = await svc.resolveLead("test.amocrm.ru", { chatType: "whatsapp", chatId: "79990001122" })

        expect(result).toMatchObject({
            found: true,
            lead_id: 100,
            should_engage_ai: true,
            ai_start_set: false,
        })
        expect(amoClient.leads.updateLead).toHaveBeenCalledTimes(1)
    })

    it("не трогает время старта ИИ, если поле уже заполнено", async () => {
        amoClient.leads.getLead.mockResolvedValue(makeLead({
            custom_fields_values: [{ field_id: 1320673, field_name: "AI start", values: [{ value: 123 }] }],
        }))
        const svc = new LeadsService(amoClient, repo)

        const result = await svc.resolveLead("test.amocrm.ru", { chatType: "whatsapp", chatId: "79990001122" })

        expect(result).toMatchObject({ found: true, should_engage_ai: true, ai_start_set: false })
        expect(amoClient.leads.updateLead).not.toHaveBeenCalled()
    })

    it("should_engage_ai=false при несовпадении этапа-триггера", async () => {
        amoClient.leads.getLead.mockResolvedValue(makeLead({ status_id: 999 }))
        const svc = new LeadsService(amoClient, repo)

        const result = await svc.resolveLead("test.amocrm.ru", { chatType: "whatsapp", chatId: "79990001122" })

        expect(result).toMatchObject({ found: true, should_engage_ai: false, ai_start_set: true })
        expect(amoClient.leads.updateLead).toHaveBeenCalledTimes(1)
    })

    it("found=false, если контакт не найден", async () => {
        amoClient.contact.getContacts.mockResolvedValue({ _embedded: { contacts: [] } })
        const svc = new LeadsService(amoClient, repo)

        const result = await svc.resolveLead("test.amocrm.ru", { chatType: "whatsapp", chatId: "79990001122" })

        expect(result).toEqual({ found: false, skip_reason: "контакт не найден в amo" })
    })

    it("found=false, если не удалось определить запрос (нет chatId/phone/username)", async () => {
        const svc = new LeadsService(amoClient, repo)

        const result = await svc.resolveLead("test.amocrm.ru", { chatType: "whatsapp" })

        expect(result).toMatchObject({ found: false })
        expect(amoClient.contact.getContacts).not.toHaveBeenCalled()
    })

    it("telegram: ищет по phone, затем по username", async () => {
        const svc = new LeadsService(amoClient, repo)
        await svc.resolveLead("test.amocrm.ru", { chatType: "telegram", username: "user1", chatId: "tg-id" })
        expect(amoClient.contact.getContacts).toHaveBeenCalledWith(
            "test.amocrm.ru", "access", { with: ["leads"], query: "user1" },
        )
    })

    it("использует статичный Bearer-токен без рефреша, если задан amoApiToken", async () => {
        repo.getIntegrationByDomain.mockResolvedValue(makeIntegration({ amoApiToken: "static-token" }))
        const svc = new LeadsService(amoClient, repo)

        await svc.resolveLead("test.amocrm.ru", { chatType: "whatsapp", chatId: "79990001122" })

        expect(amoClient.contact.getContacts).toHaveBeenCalledWith(
            "test.amocrm.ru", "static-token", { with: ["leads"], query: "79990001122" },
        )
    })
})

describe("LeadsService.applyTransition", () => {
    let repo: any
    let amoClient: any

    beforeEach(() => {
        repo = {
            getIntegrationByDomain: vi.fn().mockResolvedValue(makeIntegration()),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
            getLeadStageSettings: vi.fn().mockResolvedValue(makeAiSettings()),
            createStageEvent: vi.fn().mockResolvedValue(undefined),
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            leads: { updateLead: vi.fn().mockResolvedValue({ id: 100, status_id: 142 }) },
        }
    })

    it("assign_ai: ставит ответственного-бота", async () => {
        const svc = new LeadsService(amoClient, repo)
        await svc.applyTransition("test.amocrm.ru", 100, "assign_ai")
        expect(amoClient.leads.updateLead).toHaveBeenCalledWith(
            "test.amocrm.ru", "access", 100, { responsible_user_id: 11169598 },
        )
    })

    it("autoblock: переводит на этап автоблокировки в ИИ-воронке", async () => {
        const svc = new LeadsService(amoClient, repo)
        await svc.applyTransition("test.amocrm.ru", 100, "autoblock")
        expect(amoClient.leads.updateLead).toHaveBeenCalledWith(
            "test.amocrm.ru", "access", 100, { pipeline_id: 11015426, status_id: 86573146 },
        )
    })

    it("handoff и success используют свои статусы", async () => {
        const svc = new LeadsService(amoClient, repo)
        await svc.applyTransition("test.amocrm.ru", 100, "handoff")
        await svc.applyTransition("test.amocrm.ru", 100, "success")
        expect(amoClient.leads.updateLead).toHaveBeenNthCalledWith(1,
            "test.amocrm.ru", "access", 100, { pipeline_id: 11015426, status_id: 86573142 })
        expect(amoClient.leads.updateLead).toHaveBeenNthCalledWith(2,
            "test.amocrm.ru", "access", 100, { pipeline_id: 11015426, status_id: 142 })
    })

    it("пишет AI-событие в журнал (source=ai)", async () => {
        const svc = new LeadsService(amoClient, repo)
        await svc.applyTransition("test.amocrm.ru", 100, "autoblock")
        expect(repo.createStageEvent).toHaveBeenCalledWith(expect.objectContaining({
            domain: "test.amocrm.ru",
            source: "ai",
            leadId: 100,
            statusId: 86573146,
            pipelineId: 11015426,
            success: true,
        }))
    })

    it("ConfigError, если для домена не настроен ai_pipeline_id", async () => {
        repo.getLeadStageSettings.mockResolvedValue(makeAiSettings({ aiPipelineId: null }))
        const svc = new LeadsService(amoClient, repo)
        await expect(svc.applyTransition("test.amocrm.ru", 100, "autoblock"))
            .rejects.toBeInstanceOf(ConfigError)
        expect(amoClient.leads.updateLead).not.toHaveBeenCalled()
    })

    it("ConfigError, если не настроен ai_responsible_user_id для assign_ai", async () => {
        repo.getLeadStageSettings.mockResolvedValue(makeAiSettings({ aiResponsibleUserId: null }))
        const svc = new LeadsService(amoClient, repo)
        await expect(svc.applyTransition("test.amocrm.ru", 100, "assign_ai"))
            .rejects.toBeInstanceOf(ConfigError)
    })
})
