import { AmoClient } from "../../infra/amo/client.js";
import { IntegrationListItem, IntegrationRepo } from "./repo.js";
import { logger } from "../../logger.js";
import { callAmo } from "../../infra/amo/call_amo.js";
import { Integration } from "../../models/integration.js";
import { LeadStageSettings } from "../../models/integration_settings.js";
import { LeadStageEvent } from "../../models/lead_stage_event.js";
import { GetPipelinesResponse } from "../../infra/amo/leads.js";
import { GetUsersResponse } from "../../infra/amo/users.js";

export type HealthResult =
    | { ok: true; amojoId: string }
    | { ok: false; error: string }

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
            return settings ?? {
                domain,
                targetStatusId: null,
                targetPipelineId: null,
                targetResponsibleUserId: null,
                priorityOpenStatusId: null,
                commentTemplate: null,
                aiPipelineId: null,
                aiTriggerStatusId: null,
                aiResponsibleUserId: null,
                aiStartTimeFieldId: null,
                autoblockStatusId: null,
                handoffStatusId: null,
                successStatusId: null,
            }
        } catch (error) {
            logger.error("IntegrationSettingsService - getLeadStageSettings", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - getLeadStageSettings: ${error as Error}`)
        }
    }

    async saveLeadStageSettings(
        domain: string,
        input: {
            statusId: number | null
            pipelineId: number | null
            responsibleUserId: number | null
            priorityOpenStatusId: number | null
            commentTemplate: string | null
            aiPipelineId: number | null
            aiTriggerStatusId: number | null
            aiResponsibleUserId: number | null
            aiStartTimeFieldId: number | null
            autoblockStatusId: number | null
            handoffStatusId: number | null
            successStatusId: number | null
        },
    ): Promise<LeadStageSettings> {
        try {
            return await this.integrationRepo.upsertLeadStageSettings(domain, {
                targetStatusId: input.statusId,
                targetPipelineId: input.pipelineId,
                targetResponsibleUserId: input.responsibleUserId,
                priorityOpenStatusId: input.priorityOpenStatusId,
                commentTemplate: input.commentTemplate,
                aiPipelineId: input.aiPipelineId,
                aiTriggerStatusId: input.aiTriggerStatusId,
                aiResponsibleUserId: input.aiResponsibleUserId,
                aiStartTimeFieldId: input.aiStartTimeFieldId,
                autoblockStatusId: input.autoblockStatusId,
                handoffStatusId: input.handoffStatusId,
                successStatusId: input.successStatusId,
            })
        } catch (error) {
            logger.error("IntegrationSettingsService - saveLeadStageSettings", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - saveLeadStageSettings: ${error as Error}`)
        }
    }

    /** Сохраняем статичный Bearer-токен amoCRM для домена. */
    async setAmoToken(domain: string, token: string): Promise<void> {
        try {
            await this.integrationRepo.setAmoToken(domain, token)
        } catch (error) {
            logger.error("IntegrationSettingsService - setAmoToken", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - setAmoToken: ${error as Error}`)
        }
    }

    async listActivity(domain: string): Promise<LeadStageEvent[]> {
        try {
            return await this.integrationRepo.listStageEvents(domain)
        } catch (error) {
            logger.error("IntegrationSettingsService - listActivity", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - listActivity: ${error as Error}`)
        }
    }

    /** Проверяем валидность токена: дёргаем amo и ловим ошибку как "нужно переподключить". */
    async checkHealth(domain: string): Promise<HealthResult> {
        const integration = await this.getIntegration(domain)
        try {
            const amojoId = await callAmo(integration, this.integrationRepo, this.amoClient.auth, (accessToken) => this.amoClient.account.getAmojoID(integration.domain, accessToken))
            return { ok: true, amojoId }
        } catch (error) {
            logger.warn("IntegrationSettingsService - checkHealth - amo call failed", { domain, error: error as Error })
            return { ok: false, error: (error as Error).message }
        }
    }

    async getPipelines(domain: string): Promise<GetPipelinesResponse> {
        const integration = await this.getIntegration(domain)
        try {
            return await callAmo(integration, this.integrationRepo, this.amoClient.auth, (accessToken) => this.amoClient.leads.getPipelines(integration.domain, accessToken))
        } catch (error) {
            logger.error("IntegrationSettingsService - getPipelines", { domain, error: error as Error })
            throw new Error(`IntegrationSettingsService - getPipelines: ${error as Error}`)
        }
    }

    async getUsers(domain: string): Promise<GetUsersResponse> {
        const integration = await this.getIntegration(domain)
        try {
            return await callAmo(integration, this.integrationRepo, this.amoClient.auth, (accessToken) => this.amoClient.users.getUsers(integration.domain, accessToken))
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
