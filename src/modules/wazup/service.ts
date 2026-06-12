import { AmoClient } from "../../infra/amo/client.js";
import { WazupLeadResult, WazupWebhookBody } from "./schema.js";
import { WazupRepo } from "./repo.js";
import { logger } from "../../logger.js";
import { Integration } from "../../models/integration.js";
import { LeadResolver } from "../leads/lead_resolver.js";

export class WazupService {
    constructor(private amoClient: AmoClient, private wazupRepo: WazupRepo) { }

    async handleWazupWebhook(body: WazupWebhookBody): Promise<WazupLeadResult | null> {
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

        const resolver = new LeadResolver(this.amoClient, this.wazupRepo)

        for (const message of body.messages) {
            logger.debug("WazupService - handleWazupWebhook - processing message", { message })

            let contactQuery: string | undefined

            switch (message.chatType) {
                case "whatsapp":
                    contactQuery = message.chatId
                    break
                case "telegram":
                    if (!message.contact) {
                        logger.warn("WazupService - handleWazupWebhook - message contact not found", { message })
                        continue
                    }

                    if (message.contact.phone) {
                        contactQuery = message.contact.phone
                    } else if (message.contact.username) {
                        contactQuery = message.contact.username
                    } else {
                        logger.warn("WazupService - handleWazupWebhook - message contact phone and username not found", { message })
                        continue
                    }
                    break
                case "max":
                    if (!message.contact) {
                        logger.warn("WazupService - handleWazupWebhook - message contact not found", { message })
                        continue
                    }

                    if (!message.contact.phone) {
                        logger.warn("WazupService - handleWazupWebhook - message contact phone not found", { message })
                        continue
                    }

                    contactQuery = message.contact.phone
                    break
                default:
                    logger.warn("WazupService - handleWazupWebhook - message chat type not supported", { message })
                    continue
            }

            const result = await resolver.resolveByContactQuery(integration, contactQuery)
            if (result) {
                return result
            }
        }

        return null
    }
}
