import { AmoClient } from "../../infra/amo/client.js";
import { WazupWebhookBody } from "./schema.js";
import { WazupRepo } from "./repo.js";
import { logger } from "../../logger.js";
import { Integration } from "../../models/integration.js";
import { GetLeadResponse } from "../../infra/amo/leads.js";
import { LeadResolver, LeadResult } from "../shared/lead_resolver.js";

export class WazupService {
    private resolver: LeadResolver

    constructor(private amoClient: AmoClient, private wazupRepo: WazupRepo) {
        this.resolver = new LeadResolver(amoClient, wazupRepo)
    }

    async handleWazupWebhook(body: WazupWebhookBody): Promise<LeadResult | null> {
        let integration: Integration | null = null

        try {
            integration = await this.wazupRepo.getIntegrationByDomain(body.domain) as Integration | null
        } catch (error) {
            logger.error("WazupService - handleWazupWebhook - get integration by domain", { error: error as Error })
            throw new Error(`WazupService - handleWazupWebhook - get integration by domain: ${error as Error}`)
        }

        if (!integration) {
            logger.error("WazupService - handleWazupWebhook - integration not found", { domain: body.domain })
            throw new Error(`WazupService - handleWazupWebhook - integration not found: ${body.domain}`)
        }

        // Приоритетный этап выбора сделки берём из настроек домена (раньше был мок-константой).
        // Ошибку чтения настроек не считаем фатальной — просто работаем без приоритета.
        let priorityOpenStatusId: number | null = null
        try {
            const settings = await this.wazupRepo.getLeadStageSettings(body.domain)
            priorityOpenStatusId = settings?.priorityOpenStatusId ?? null
        } catch (error) {
            logger.warn("WazupService - handleWazupWebhook - get settings (ignored)", { domain: body.domain, error: error as Error })
        }

        // Причина последнего пропуска — попадёт в журнал, если ни одно сообщение не дало сделку.
        let skipReason = "не найдена подходящая сделка"

        try {
            for (const message of body.messages) {
                logger.debug("WazupService - handleWazupWebhook - processing message", { message })

                let query: string | undefined

                switch (message.chatType) {
                    case "whatsapp":
                        query = message.chatId
                        break
                    case "telegram":
                        if (!message.contact) {
                            skipReason = "telegram: контакт не передан"
                            logger.warn("WazupService - handleWazupWebhook - message contact not found", { message })
                            continue
                        }
                        if (message.contact.phone) {
                            query = message.contact.phone
                        } else if (message.contact.username) {
                            query = message.contact.username
                        } else {
                            skipReason = "telegram: нет телефона и username"
                            logger.warn("WazupService - handleWazupWebhook - message contact phone and username not found", { message })
                            continue
                        }
                        break
                    case "max":
                        if (!message.contact) {
                            skipReason = "max: контакт не передан"
                            logger.warn("WazupService - handleWazupWebhook - message contact not found", { message })
                            continue
                        }
                        if (!message.contact.phone) {
                            skipReason = "max: нет телефона"
                            logger.warn("WazupService - handleWazupWebhook - message contact phone not found", { message })
                            continue
                        }
                        query = message.contact.phone
                        break
                    default:
                        skipReason = "неподдерживаемый тип чата"
                        logger.warn("WazupService - handleWazupWebhook - message chat type not supported", { message })
                        continue
                }

                const outcome = await this.resolver.findLead(integration, query, priorityOpenStatusId)
                if (outcome.status === "skipped") {
                    skipReason = outcome.reason
                    logger.warn("WazupService - handleWazupWebhook - lead not resolved", { query, reason: outcome.reason })
                    continue
                }

                const result = await this.resolver.buildResult(integration, outcome.lead)
                await this.logEvent(body.domain, true, outcome.lead, null)
                return result
            }

            await this.logEvent(body.domain, false, null, skipReason)
            return null
        } catch (error) {
            await this.logEvent(body.domain, false, null, (error as Error).message)
            throw error
        }
    }

    /** Пишем исход обработки вебхука в журнал (best-effort, не роняет основную операцию). */
    private async logEvent(domain: string, success: boolean, lead: GetLeadResponse | null, error: string | null): Promise<void> {
        try {
            await this.wazupRepo.createLeadEvent({
                domain,
                source: "wazup",
                leadId: lead?.id ?? null,
                statusId: lead?.status_id ?? null,
                pipelineId: lead?.pipeline_id ?? null,
                responsibleUserId: lead?.responsible_user_id ?? null,
                success,
                error,
            })
        } catch (logError) {
            logger.error("WazupService - handleWazupWebhook - log event (ignored)", { domain, error: logError as Error })
        }
    }
}
