import { AmoClient } from "../../infra/amo/client.js";
import { logger } from "../../logger.js";
import { callAmo } from "../../infra/amo/call_amo.js";
import { Integration } from "../../models/integration.js";
import { GetLeadResponse } from "../../infra/amo/leads.js";
import { GetContactListResponse } from "../../infra/amo/contact.js";
import type { GetAccessTokenResponse } from "../../infra/amo/auth.js";

// amoCRM: глобальные финальные статусы сделки — 142 (успешно реализовано) и 143 (закрыто и не реализовано)
const CLOSED_STATUS_IDS = new Set([142, 143])

/** Результат подбора сделки — единый формат для всех провайдеров (wazup, pact). */
export type LeadResult = {
    lead_id: number
    closed: boolean
    responsible_user_name: string
    custom_fields: { name: string; value: unknown }[]
}

export type FindLeadOutcome =
    | { status: "found"; lead: GetLeadResponse }
    | { status: "skipped"; reason: string }

// Хранилище токенов, достаточное для withAmoTokenRefresh (реализуют репозитории модулей).
interface TokenStorage {
    getIntegrationByDomain(domain: string): Promise<Integration>
    updateIntegrationTokens(domain: string, accessToken: string, refreshToken: string): Promise<unknown>
}

interface AmoAuthRefresher {
    refreshToken(refreshToken: string, domain: string): Promise<GetAccessTokenResponse>
}

/**
 * Общая логика подбора сделки по контакту: используется провайдерами-агрегаторами
 * (wazup, pact). На вход — поисковый запрос (телефон/username/chatId), на выход —
 * открытая сделка и готовый LeadResult. amo-вызовы идут через token refresh.
 */
export class LeadResolver {
    constructor(private amoClient: AmoClient, private tokenStorage: TokenStorage) { }

    /** Находим контакт по запросу и выбираем подходящую открытую сделку. */
    async findLead(integration: Integration, query: string, priorityOpenStatusId: number | null): Promise<FindLeadOutcome> {
        let contacts: GetContactListResponse
        try {
            contacts = await callAmo(integration, this.tokenStorage, this.auth(), (accessToken) =>
                this.amoClient.contact.getContacts(integration.domain, accessToken, { with: ["leads"], query }),
            )
        } catch (error) {
            logger.error("LeadResolver - findLead - get contacts", { error: error as Error })
            throw new Error(`LeadResolver - findLead - get contacts: ${error as Error}`)
        }

        const list = contacts?._embedded?.contacts ?? []
        if (list.length === 0) {
            return { status: "skipped", reason: "контакт не найден в amo" }
        }
        if (list.length > 1) {
            logger.warn("LeadResolver - findLead - multiple contacts found", { query })
        }

        const contact = list[0]
        if (!contact) {
            return { status: "skipped", reason: "контакт не найден в amo" }
        }

        const leadIds = (contact._embedded?.leads ?? []).map((lead) => lead.id)
        if (leadIds.length === 0) {
            return { status: "skipped", reason: "у контакта нет сделок" }
        }

        const leads = await this.getLeads(integration, leadIds)
        const selected = this.selectLead(leads, priorityOpenStatusId)
        if (!selected) {
            return { status: "skipped", reason: "нет открытых сделок" }
        }

        return { status: "found", lead: selected }
    }

    /** Собираем ответ по выбранной сделке (имя ответственного + кастом-поля). */
    async buildResult(integration: Integration, lead: GetLeadResponse): Promise<LeadResult> {
        let responsibleUserName = ""
        try {
            const user = await callAmo(integration, this.tokenStorage, this.auth(), (accessToken) =>
                this.amoClient.users.getUserByID(integration.domain, accessToken, lead.responsible_user_id, {}),
            )
            responsibleUserName = user.name
        } catch (error) {
            logger.error("LeadResolver - buildResult - get responsible user", { userId: lead.responsible_user_id, error: error as Error })
            throw new Error(`LeadResolver - buildResult - get responsible user ${lead.responsible_user_id}: ${error as Error}`)
        }

        const custom_fields = (lead.custom_fields_values ?? []).flatMap((field) =>
            field.values.map((entry) => ({ name: field.field_name, value: entry.value })),
        )

        return {
            lead_id: lead.id,
            closed: this.isLeadClosed(lead),
            responsible_user_name: responsibleUserName,
            custom_fields,
        }
    }

    private auth(): AmoAuthRefresher {
        return this.amoClient.auth
    }

    private async getLeads(integration: Integration, leadIds: number[]): Promise<GetLeadResponse[]> {
        const leads: GetLeadResponse[] = []
        for (const leadId of leadIds) {
            try {
                const lead = await callAmo(integration, this.tokenStorage, this.auth(), (accessToken) =>
                    this.amoClient.leads.getLead(integration.domain, accessToken, leadId, {}),
                )
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

    /**
     * Открытые сделки в приоритете; при нескольких — сделка на приоритетном статусе
     * (из настроек домена), иначе фолбэк на первую открытую.
     */
    private selectLead(leads: GetLeadResponse[], priorityOpenStatusId: number | null): GetLeadResponse | null {
        const openLeads = leads.filter((lead) => !this.isLeadClosed(lead))

        if (openLeads.length === 0) return null
        if (openLeads.length === 1) return openLeads[0] ?? null

        if (priorityOpenStatusId != null) {
            const priorityLead = openLeads.find((lead) => lead.status_id === priorityOpenStatusId)
            if (priorityLead) return priorityLead
        }

        logger.warn("LeadResolver - selectLead - multiple open leads, no priority-status match, fallback to first", {
            leadIds: openLeads.map((lead) => lead.id),
        })
        return openLeads[0] ?? null
    }
}
