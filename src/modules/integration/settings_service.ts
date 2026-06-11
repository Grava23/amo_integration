import { AmoClient } from "../../infra/amo/client.js";
import { IntegrationListItem, IntegrationRepo } from "./repo.js";
import { logger } from "../../logger.js";
import { withAmoTokenRefresh } from "../../infra/amo/with_token_refresh.js";
import { Integration } from "../../models/integration.js";
import { LeadStageSettings } from "../../models/integration_settings.js";
import { GetPipelinesResponse } from "../../infra/amo/leads.js";
import { GetUsersResponse } from "../../infra/amo/users.js";

/**
 * Настройки интеграции + данные для дропдаунов на фронте (воронки/этапы, пользователи).
 * Отделено от IntegrationService (тот про active-флаг), т.к. здесь нужен amoClient.
 */
export class IntegrationSettingsService {
    constructor(private amoClient: AmoClient, private integrationRepo: IntegrationRepo) { }

    async listIntegrations(): Promise<IntegrationListItem[]> {
        try {
            return await this.integrationRepo.listIntegrations()
        } catch (error) {
            logger.error("IntegrationSettingsService - listIntegrations", { error: error as Error })
            throw new Error(`IntegrationSettingsService - listIntegrations: ${error as Error}`)
        }
    }

    async getLeadStageSettings(domain: string): Promise<LeadStageSettings> {
        try {
            const settings = await this.integrationRepo.getLeadStageSettings(domain)
            return settings ?? { domain, targetStatusId: null, targetPipelineId: null, targetResponsibleUserId: null }
        } catch (error) {
            logger.error("IntegrationSettingsService - getLeadStageSettings", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - getLeadStageSettings: ${error as Error}`)
        }
    }

    async saveLeadStageSettings(
        domain: string,
        input: { statusId: number | null; pipelineId: number | null; responsibleUserId: number | null },
    ): Promise<LeadStageSettings> {
        try {
            return await this.integrationRepo.upsertLeadStageSettings(domain, {
                targetStatusId: input.statusId,
                targetPipelineId: input.pipelineId,
                targetResponsibleUserId: input.responsibleUserId,
            })
        } catch (error) {
            logger.error("IntegrationSettingsService - saveLeadStageSettings", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - saveLeadStageSettings: ${error as Error}`)
        }
    }

    async getPipelines(domain: string): Promise<GetPipelinesResponse> {
        const integration = await this.getIntegration(domain)
        try {
            return await withAmoTokenRefresh(integration, this.integrationRepo, this.amoClient.auth, (accessToken) => this.amoClient.leads.getPipelines(integration.domain, accessToken))
        } catch (error) {
            logger.error("IntegrationSettingsService - getPipelines", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - getPipelines: ${error as Error}`)
        }
    }

    async getUsers(domain: string): Promise<GetUsersResponse> {
        const integration = await this.getIntegration(domain)
        try {
            return await withAmoTokenRefresh(integration, this.integrationRepo, this.amoClient.auth, (accessToken) => this.amoClient.users.getUsers(integration.domain, accessToken))
        } catch (error) {
            logger.error("IntegrationSettingsService - getUsers", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - getUsers: ${error as Error}`)
        }
    }

    private async getIntegration(domain: string): Promise<Integration> {
        try {
            return await this.integrationRepo.getIntegrationByDomain(domain)
        } catch (error) {
            logger.error("IntegrationSettingsService - get integration by domain", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - get integration by domain: ${error as Error}`)
        }
    }
}
