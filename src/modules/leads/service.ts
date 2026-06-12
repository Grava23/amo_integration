import { AmoClient } from "../../infra/amo/client.js";
import { LeadsRepo } from "./repo.js";
import { logger } from "../../logger.js";
import { withAmoTokenRefresh } from "../../infra/amo/with_token_refresh.js";
import { Integration } from "../../models/integration.js";
import { AddNotesBody, AddNotesResponse } from "../../infra/amo/notes.js";
import { UpdateLeadBody, UpdateLeadResponse } from "../../infra/amo/leads.js";
import { LeadStageSettings } from "../../models/integration_settings.js";
import { LeadResolver } from "./lead_resolver.js";
import type { LeadResult } from "./schema.js";

export class LeadsService {
    constructor(private amoClient: AmoClient, private leadsRepo: LeadsRepo) { }

    /** Подбираем открытую сделку по телефону или username контакта */
    async findLeadByContact(domain: string, phone?: string, username?: string): Promise<LeadResult | null> {
        const contactQuery = phone ?? username
        if (!contactQuery) {
            throw new Error("LeadsService - findLeadByContact - phone or username is required")
        }

        let integration: Integration
        try {
            integration = await this.leadsRepo.getIntegrationByDomain(domain)
        } catch (error) {
            logger.error("LeadsService - findLeadByContact - get integration by domain", { domain, error: error as Error })
            throw new Error(`LeadsService - findLeadByContact - get integration by domain: ${error as Error}`)
        }

        const resolver = new LeadResolver(this.amoClient, this.leadsRepo)
        return resolver.resolveByContactQuery(integration, contactQuery)
    }

    /** Добавляем обычный (common) комментарий к сделке */
    async addComment(domain: string, leadId: number, text: string): Promise<AddNotesResponse> {
        let integration: Integration
        try {
            integration = await this.leadsRepo.getIntegrationByDomain(domain)
        } catch (error) {
            logger.error("LeadsService - addComment - get integration by domain", { domain, error: error as Error })
            throw new Error(`LeadsService - addComment - get integration by domain: ${error as Error}`)
        }

        const body: AddNotesBody = [
            {
                note_type: "common",
                params: { text },
            },
        ]

        try {
            return await withAmoTokenRefresh(integration, this.leadsRepo, this.amoClient.auth, (accessToken) => this.amoClient.notes.addNotesByEntityTypeAndID(integration.domain, accessToken, "leads", leadId, body))
        } catch (error) {
            logger.error("LeadsService - addComment - add note", { domain, leadId, error: error as Error })
            throw new Error(`LeadsService - addComment - add note: ${error as Error}`)
        }
    }

    /** Переводим сделку на захардкоженный этап и меняем ответственного */
    async changeStageAndResponsible(domain: string, leadId: number): Promise<UpdateLeadResponse> {
        let integration: Integration
        try {
            integration = await this.leadsRepo.getIntegrationByDomain(domain)
        } catch (error) {
            logger.error("LeadsService - changeStageAndResponsible - get integration by domain", { domain, error: error as Error })
            throw new Error(`LeadsService - changeStageAndResponsible - get integration by domain: ${error as Error}`)
        }

        // Целевой этап/ответственный берём из настроек домена (БД). null = поле не отправляем.
        let settings: LeadStageSettings | null
        try {
            settings = await this.leadsRepo.getLeadStageSettings(domain)
        } catch (error) {
            logger.error("LeadsService - changeStageAndResponsible - get settings", { domain, error: error as Error })
            throw new Error(`LeadsService - changeStageAndResponsible - get settings: ${error as Error}`)
        }

        const body: UpdateLeadBody = {}
        if (settings?.targetStatusId != null) {
            body.status_id = settings.targetStatusId
        }
        if (settings?.targetPipelineId != null) {
            body.pipeline_id = settings.targetPipelineId
        }
        if (settings?.targetResponsibleUserId != null) {
            body.responsible_user_id = settings.targetResponsibleUserId
        }

        if (Object.keys(body).length === 0) {
            logger.error("LeadsService - changeStageAndResponsible - settings not configured", { domain, leadId })
            throw new Error(`LeadsService - changeStageAndResponsible - settings not configured for domain ${domain}`)
        }

        try {
            return await withAmoTokenRefresh(integration, this.leadsRepo, this.amoClient.auth, (accessToken) => this.amoClient.leads.updateLead(integration.domain, accessToken, leadId, body))
        } catch (error) {
            logger.error("LeadsService - changeStageAndResponsible - update lead", { domain, leadId, error: error as Error })
            throw new Error(`LeadsService - changeStageAndResponsible - update lead: ${error as Error}`)
        }
    }
}
