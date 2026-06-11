import { describe, it, expect, vi, beforeEach } from "vitest"
import { IntegrationService } from "../../../src/modules/integration/service.js"

describe("IntegrationService.updateIntegrationActive", () => {
    let repo: any

    beforeEach(() => {
        repo = {
            updateIntegrationActive: vi.fn().mockResolvedValue(undefined),
        }
    })

    it("успех: делегирует repo.updateIntegrationActive", async () => {
        const svc = new IntegrationService(repo)

        await expect(svc.updateIntegrationActive("test.amocrm.ru", false)).resolves.toBeUndefined()
        expect(repo.updateIntegrationActive).toHaveBeenCalledWith("test.amocrm.ru", false)
    })

    it("бросает ошибку, если repo упал", async () => {
        repo.updateIntegrationActive.mockRejectedValue(new Error("db down"))
        const svc = new IntegrationService(repo)

        await expect(svc.updateIntegrationActive("test.amocrm.ru", true))
            .rejects.toThrow("IntegrationService - updateIntegrationActive")
    })
})
