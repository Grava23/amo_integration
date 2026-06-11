import { describe, it, expect, vi, beforeEach } from "vitest"
import { LeadsService } from "../../../src/modules/leads/service.js"

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

describe("LeadsService.addComment", () => {
    let repo: any
    let amoClient: any

    beforeEach(() => {
        repo = {
            getIntegrationByDomain: vi.fn().mockResolvedValue(makeIntegration()),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
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
            }),
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
