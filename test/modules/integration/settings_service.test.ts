import { describe, it, expect, vi, beforeEach } from "vitest"
import { IntegrationSettingsService } from "../../../src/modules/integration/settings_service.js"

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

describe("IntegrationSettingsService", () => {
    let repo: any
    let amoClient: any

    beforeEach(() => {
        repo = {
            listIntegrations: vi.fn().mockResolvedValue([{ domain: "test.amocrm.ru", active: true }]),
            getIntegrationByDomain: vi.fn().mockResolvedValue(makeIntegration()),
            updateIntegrationTokens: vi.fn().mockResolvedValue(undefined),
            getLeadStageSettings: vi.fn().mockResolvedValue(null),
            upsertLeadStageSettings: vi.fn().mockResolvedValue({
                domain: "test.amocrm.ru",
                targetStatusId: 142,
                targetPipelineId: 1,
                targetResponsibleUserId: 7,
            }),
        }
        amoClient = {
            auth: { refreshToken: vi.fn() },
            leads: { getPipelines: vi.fn().mockResolvedValue({ _embedded: { pipelines: [] } }) },
            users: { getUsers: vi.fn().mockResolvedValue({ _embedded: { users: [] } }) },
        }
    })

    it("getLeadStageSettings: при отсутствии записи отдаёт нулевые поля", async () => {
        const svc = new IntegrationSettingsService(amoClient, repo)
        const settings = await svc.getLeadStageSettings("test.amocrm.ru")
        expect(settings).toEqual({
            domain: "test.amocrm.ru",
            targetStatusId: null,
            targetPipelineId: null,
            targetResponsibleUserId: null,
        })
    })

    it("saveLeadStageSettings: мапит camelCase и делегирует repo.upsert", async () => {
        const svc = new IntegrationSettingsService(amoClient, repo)
        const res = await svc.saveLeadStageSettings("test.amocrm.ru", { statusId: 142, pipelineId: 1, responsibleUserId: 7 })

        expect(repo.upsertLeadStageSettings).toHaveBeenCalledWith("test.amocrm.ru", {
            targetStatusId: 142,
            targetPipelineId: 1,
            targetResponsibleUserId: 7,
        })
        expect(res.targetStatusId).toBe(142)
    })

    it("getPipelines: проксирует amo через token refresh", async () => {
        const svc = new IntegrationSettingsService(amoClient, repo)
        await svc.getPipelines("test.amocrm.ru")
        expect(amoClient.leads.getPipelines).toHaveBeenCalledWith("test.amocrm.ru", "access")
    })

    it("getUsers: бросает понятную ошибку, если интеграции нет", async () => {
        repo.getIntegrationByDomain.mockRejectedValue(new Error("not found"))
        const svc = new IntegrationSettingsService(amoClient, repo)
        await expect(svc.getUsers("missing.amocrm.ru")).rejects.toThrow("get integration by domain")
        expect(amoClient.users.getUsers).not.toHaveBeenCalled()
    })
})
