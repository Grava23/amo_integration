import { logger } from "../../logger.js";
import { IntegrationRepo } from "./repo.js";

export class IntegrationService {
    constructor(private integrationRepo: IntegrationRepo) { }

    async updateIntegrationActive(domain: string, active: boolean) {
        try {
            await this.integrationRepo.updateIntegrationActive(domain, active)
        } catch (error) {
            logger.error("IntegrationService - updateIntegrationActive - updateIntegrationActive", { error: error as Error })
            throw new Error(`IntegrationService - updateIntegrationActive - updateIntegrationActive: ${error as Error}`)
        }
    }
}