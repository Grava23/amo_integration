import { AmoClient } from "../../infra/amo/client.js";
import { logger } from "../../logger.js";
import { withAmoTokenRefresh } from "../../infra/amo/with_token_refresh.js";
import { Integration } from "../../models/integration.js";
import { GetContactListParams, GetContactListResponse } from "../../infra/amo/contact.js";
import { GetLeadResponse } from "../../infra/amo/leads.js";
import type { LeadResult } from "./schema.js";

// amoCRM: глобальные финальные статусы сделки — 142 (успешно реализовано) и 143 (закрыто и не реализовано)
const CLOSED_STATUS_IDS = new Set([142, 143])

// МОК: при нескольких открытых сделках выбираем сделку на этом статусе.
// TODO: заменить на реальный status_id, когда уточнят.
const PRIORITY_OPEN_STATUS_ID = 0

interface TokenStorage {
    getIntegrationByDomain(domain: string): Promise<Integration>
    updateIntegrationTokens(domain: string, accessToken: string, refreshToken: string): Promise<unknown>
}

export class LeadResolver {
    constructor(private amoClient: AmoClient, private storage: TokenStorage) { }

    async resolveByContactQuery(integration: Integration, contactQuery: string): Promise<LeadResult | null> {
        const getContactsParams: GetContactListParams = {
            with: ["leads"],
            query: contactQuery,
        }

        let contacts: GetContactListResponse | null = null
        try {
            contacts = await withAmoTokenRefresh(integration, this.storage, this.amoClient.auth, (accessToken) => this.amoClient.contact.getContacts(integration.domain, accessToken, getContactsParams))
        } catch (error) {
            logger.error("LeadResolver - resolveByContactQuery - get contacts", { error: error as Error })
            throw new Error(`LeadResolver - resolveByContactQuery - get contacts: ${error as Error}`)
        }

        if (!contacts || contacts._embedded.contacts.length === 0) {
            logger.warn("LeadResolver - resolveByContactQuery - contacts not found", { getContactsParams })
            return null
        }

        if (contacts._embedded.contacts.length > 1) {
            logger.warn("LeadResolver - resolveByContactQuery - multiple contacts found", { getContactsParams })
        }

        const contact = contacts._embedded.contacts[0]
        if (!contact) {
            return null
        }

        const leadIds = (contact._embedded?.leads ?? []).map((lead) => lead.id)

        if (leadIds.length === 0) {
            logger.warn("LeadResolver - resolveByContactQuery - contact has no leads", { contactId: contact.id })
            return null
        }

        const leads = await this.getLeads(integration, leadIds)

        const selectedLead = this.selectLead(leads)
        if (!selectedLead) {
            logger.warn("LeadResolver - resolveByContactQuery - no suitable lead found", { contactId: contact.id, leadIds })
            return null
        }

        return await this.buildLeadResult(integration, selectedLead)
    }

    private async getLeads(integration: Integration, leadIds: number[]): Promise<GetLeadResponse[]> {
        const leads: GetLeadResponse[] = []

        for (const leadId of leadIds) {
            try {
                const lead = await withAmoTokenRefresh(integration, this.storage, this.amoClient.auth, (accessToken) => this.amoClient.leads.getLead(integration.domain, accessToken, leadId, {}))
                leads.push(lead)
            } catch (error) {
                logger.error("LeadResolver - getLeads - get lead", { leadId, error: error as Error })
                throw new Error(`LeadResolver - getLeads - get lead ${leadId}: ${error as Error}`)
            }
        }

        return leads
    }

    private isLeadClosed(lead: GetLeadResponse): boolean {
        return CLOSED_STATUS_IDS.has(lead.status_id)
    }

    private selectLead(leads: GetLeadResponse[]): GetLeadResponse | null {
        const openLeads = leads.filter((lead) => !this.isLeadClosed(lead))

        if (openLeads.length === 0) {
            return null
        }

        if (openLeads.length === 1) {
            return openLeads[0] ?? null
        }

        const priorityLead = openLeads.find((lead) => lead.status_id === PRIORITY_OPEN_STATUS_ID)
        if (priorityLead) {
            return priorityLead
        }

        logger.warn("LeadResolver - selectLead - multiple open leads, no priority-status match, fallback to first", {
            leadIds: openLeads.map((lead) => lead.id),
        })
        return openLeads[0] ?? null
    }

    private async buildLeadResult(integration: Integration, lead: GetLeadResponse): Promise<LeadResult> {
        let responsibleUserName = ""
        try {
            const user = await withAmoTokenRefresh(integration, this.storage, this.amoClient.auth, (accessToken) => this.amoClient.users.getUserByID(integration.domain, accessToken, lead.responsible_user_id, {}))
            responsibleUserName = user.name
        } catch (error) {
            logger.error("LeadResolver - buildLeadResult - get responsible user", { userId: lead.responsible_user_id, error: error as Error })
            throw new Error(`LeadResolver - buildLeadResult - get responsible user ${lead.responsible_user_id}: ${error as Error}`)
        }

        const customFields = (lead.custom_fields_values ?? []).flatMap((field) =>
            field.values.map((entry) => ({
                name: field.field_name,
                value: entry.value,
            }))
        )

        return {
            lead_id: lead.id,
            closed: this.isLeadClosed(lead),
            responsible_user_name: responsibleUserName,
            custom_fields: customFields,
        }
    }
}
