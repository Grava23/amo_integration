import { AmoClient } from "../../infra/amo/client.js";
import { LeadsRepo } from "./repo.js";
import { logger } from "../../logger.js";
import { callAmo } from "../../infra/amo/call_amo.js";
import { Integration } from "../../models/integration.js";
import { AddNotesBody, AddNotesResponse } from "../../infra/amo/notes.js";
import { UpdateLeadBody, UpdateLeadResponse, GetLeadResponse } from "../../infra/amo/leads.js";
import { LeadStageSettings } from "../../models/integration_settings.js";
import { LeadResolver } from "../shared/lead_resolver.js";

/** Ошибка конфигурации домена (не заданы нужные ID в integration_settings). */
export class ConfigError extends Error { }

/** Вход для подбора сделки по входящему сообщению (каналозависимый). */
export type ResolveLeadInput = {
    chatType?: string | undefined
    chatId?: string | undefined
    phone?: string | undefined
    username?: string | undefined
}

/** Тип перехода сделки в ИИ-воронке (соответствует узлам n8n). */
export type LeadTransition = "assign_ai" | "autoblock" | "handoff" | "success"

/** Результат подбора сделки для ИИ-воронки. */
export type ResolveLeadResult =
    | { found: false; skip_reason: string }
    | {
        found: true
        lead_id: number
        pipeline_id: number
        status_id: number
        closed: boolean
        responsible_user_id: number
        custom_fields: { field_id: number; name: string; value: unknown }[]
        should_engage_ai: boolean
        ai_start_set: boolean
    }

export class LeadsService {
    private resolver: LeadResolver

    constructor(private amoClient: AmoClient, private leadsRepo: LeadsRepo) {
        this.resolver = new LeadResolver(amoClient, leadsRepo)
    }

    /** Добавляем обычный (common) комментарий к сделке. Без text берём шаблон из настроек домена. */
    async addComment(domain: string, leadId: number, text?: string): Promise<AddNotesResponse> {
        let integration: Integration
        try {
            integration = await this.leadsRepo.getIntegrationByDomain(domain)
        } catch (error) {
            logger.error("LeadsService - addComment - get integration by domain", { domain, error: error as Error })
            throw new Error(`LeadsService - addComment - get integration by domain: ${error as Error}`)
        }

        let commentText = text
        if (!commentText) {
            let settings: LeadStageSettings | null
            try {
                settings = await this.leadsRepo.getLeadStageSettings(domain)
            } catch (error) {
                logger.error("LeadsService - addComment - get settings", { domain, error: error as Error })
                throw new Error(`LeadsService - addComment - get settings: ${error as Error}`)
            }
            commentText = settings?.commentTemplate ?? undefined
        }

        if (!commentText) {
            logger.error("LeadsService - addComment - no text and no template", { domain, leadId })
            throw new Error(`LeadsService - addComment - no text provided and no comment_template configured for domain ${domain}`)
        }

        const body: AddNotesBody = [
            {
                note_type: "common",
                params: { text: commentText },
            },
        ]

        try {
            return await callAmo(integration, this.leadsRepo, this.amoClient.auth, (accessToken) => this.amoClient.notes.addNotesByEntityTypeAndID(integration.domain, accessToken, "leads", leadId, body))
        } catch (error) {
            logger.error("LeadsService - addComment - add note", { domain, leadId, error: error as Error })
            throw new Error(`LeadsService - addComment - add note: ${error as Error}`)
        }
    }

    /** Переводим сделку на этап и ответственного из настроек домена (integration_settings) */
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
            const result = await callAmo(integration, this.leadsRepo, this.amoClient.auth, (accessToken) => this.amoClient.leads.updateLead(integration.domain, accessToken, leadId, body))
            await this.logStageEvent(domain, leadId, body, true, null)
            return result
        } catch (error) {
            logger.error("LeadsService - changeStageAndResponsible - update lead", { domain, leadId, error: error as Error })
            await this.logStageEvent(domain, leadId, body, false, (error as Error).message)
            throw new Error(`LeadsService - changeStageAndResponsible - update lead: ${error as Error}`)
        }
    }

    /**
     * Подбор сделки по входящему сообщению (заменяет в n8n: Get contact by … + get lead1 + If6).
     * Возвращает сделку целиком (контакт отдельно не отдаём) + гейт should_engage_ai.
     * Под капотом проставляет «время старта ИИ», если сделка вовлечена и поле ещё не задано.
     */
    async resolveLead(domain: string, input: ResolveLeadInput): Promise<ResolveLeadResult> {
        const integration = await this.getIntegration(domain, "resolveLead")
        const settings = await this.getSettings(domain, "resolveLead")

        const query = this.pickQuery(input)
        if (!query) {
            return { found: false, skip_reason: "не удалось определить запрос для поиска контакта (нет chatId/phone/username)" }
        }

        const outcome = await this.resolver.findLead(integration, query, settings?.priorityOpenStatusId ?? null)
        if (outcome.status === "skipped") {
            return { found: false, skip_reason: outcome.reason }
        }

        const lead = outcome.lead
        const closed = (lead.closed_at ?? 0) > 0

        const shouldEngage =
            !closed &&
            settings?.aiPipelineId != null &&
            settings?.aiTriggerStatusId != null &&
            lead.pipeline_id === settings.aiPipelineId &&
            lead.status_id === settings.aiTriggerStatusId

        // «Время старта ИИ» — под капотом, идемпотентно (заменяет If1 + set start ai time).
        let aiStartSet = false
        if (shouldEngage && settings?.aiStartTimeFieldId != null) {
            aiStartSet = await this.ensureAiStartTime(integration, lead, settings.aiStartTimeFieldId)
        }

        const custom_fields = (lead.custom_fields_values ?? []).flatMap((field) =>
            field.values.map((entry) => ({ field_id: field.field_id, name: field.field_name, value: entry.value })),
        )

        return {
            found: true,
            lead_id: lead.id,
            pipeline_id: lead.pipeline_id,
            status_id: lead.status_id,
            closed,
            responsible_user_id: lead.responsible_user_id,
            custom_fields,
            should_engage_ai: shouldEngage,
            ai_start_set: aiStartSet,
        }
    }

    /**
     * Переход сделки в ИИ-воронке одним вызовом (заменяет в n8n: change lead responsible and status
     * + autoblock/handoff/success stage). Поля берутся из конфигурации домена.
     */
    async applyTransition(domain: string, leadId: number, type: LeadTransition): Promise<UpdateLeadResponse> {
        const integration = await this.getIntegration(domain, "applyTransition")
        const settings = await this.getSettings(domain, "applyTransition")

        const body = this.buildTransitionBody(domain, type, settings)

        try {
            const result = await callAmo(integration, this.leadsRepo, this.amoClient.auth, (accessToken) => this.amoClient.leads.updateLead(integration.domain, accessToken, leadId, body))
            await this.logAiEvent(domain, leadId, body, true, null)
            return result
        } catch (error) {
            logger.error("LeadsService - applyTransition - update lead", { domain, leadId, type, error: error as Error })
            await this.logAiEvent(domain, leadId, body, false, (error as Error).message)
            throw new Error(`LeadsService - applyTransition - update lead: ${error as Error}`)
        }
    }

    /** Тело PATCH для перехода. Кидает ConfigError, если нужные ID не настроены в домене. */
    private buildTransitionBody(domain: string, type: LeadTransition, settings: LeadStageSettings | null): UpdateLeadBody {
        if (type === "assign_ai") {
            if (settings?.aiResponsibleUserId == null) {
                throw new ConfigError(`applyTransition - assign_ai: не задан ai_responsible_user_id для домена ${domain}`)
            }
            return { responsible_user_id: settings.aiResponsibleUserId }
        }

        if (settings?.aiPipelineId == null) {
            throw new ConfigError(`applyTransition - ${type}: не задан ai_pipeline_id для домена ${domain}`)
        }

        const statusByType: Record<Exclude<LeadTransition, "assign_ai">, number | null> = {
            autoblock: settings.autoblockStatusId,
            handoff: settings.handoffStatusId,
            success: settings.successStatusId,
        }
        const statusId = statusByType[type]
        if (statusId == null) {
            throw new ConfigError(`applyTransition - ${type}: не задан статус (${type}_status_id) для домена ${domain}`)
        }

        return { pipeline_id: settings.aiPipelineId, status_id: statusId }
    }

    /** Проставляем «время старта ИИ», если поле ещё не заполнено. best-effort, возвращает было ли проставлено. */
    private async ensureAiStartTime(integration: Integration, lead: GetLeadResponse, fieldId: number): Promise<boolean> {
        const alreadySet = (lead.custom_fields_values ?? []).some((f) => f.field_id === fieldId)
        if (alreadySet) {
            return false
        }

        const body: UpdateLeadBody = {
            custom_fields_values: [{ field_id: fieldId, values: [{ value: Math.floor(Date.now() / 1000) }] }],
        }

        try {
            await callAmo(integration, this.leadsRepo, this.amoClient.auth, (accessToken) => this.amoClient.leads.updateLead(integration.domain, accessToken, lead.id, body))
            return true
        } catch (error) {
            logger.error("LeadsService - ensureAiStartTime - update lead (ignored)", { domain: integration.domain, leadId: lead.id, error: error as Error })
            return false
        }
    }

    /** Выбор поискового запроса по каналу (как в WazupService): telegram→phone/username, max→phone, иначе→chatId. */
    private pickQuery(input: ResolveLeadInput): string | null {
        switch (input.chatType) {
            case "telegram":
            case "telegroup":
                return input.phone || input.username || input.chatId || null
            case "max":
            case "maxgroup":
                return input.phone || input.chatId || null
            default:
                return input.chatId || input.phone || input.username || null
        }
    }

    private async getIntegration(domain: string, ctx: string): Promise<Integration> {
        try {
            return await this.leadsRepo.getIntegrationByDomain(domain)
        } catch (error) {
            logger.error(`LeadsService - ${ctx} - get integration by domain`, { domain, error: error as Error })
            throw new Error(`LeadsService - ${ctx} - get integration by domain: ${error as Error}`)
        }
    }

    private async getSettings(domain: string, ctx: string): Promise<LeadStageSettings | null> {
        try {
            return await this.leadsRepo.getLeadStageSettings(domain)
        } catch (error) {
            logger.error(`LeadsService - ${ctx} - get settings`, { domain, error: error as Error })
            throw new Error(`LeadsService - ${ctx} - get settings: ${error as Error}`)
        }
    }

    /** Журнал AI-перехода (best-effort). */
    private async logAiEvent(domain: string, leadId: number, body: UpdateLeadBody, success: boolean, error: string | null): Promise<void> {
        try {
            await this.leadsRepo.createStageEvent({
                domain,
                source: "ai",
                leadId,
                statusId: body.status_id ?? null,
                pipelineId: body.pipeline_id ?? null,
                responsibleUserId: body.responsible_user_id ?? null,
                success,
                error,
            })
        } catch (logError) {
            logger.error("LeadsService - logAiEvent (ignored)", { domain, leadId, error: logError as Error })
        }
    }

    /** Пишем запись в журнал. Логирование не должно ронять основную операцию. */
    private async logStageEvent(domain: string, leadId: number, body: UpdateLeadBody, success: boolean, error: string | null): Promise<void> {
        try {
            await this.leadsRepo.createStageEvent({
                domain,
                source: "manual",
                leadId,
                statusId: body.status_id ?? null,
                pipelineId: body.pipeline_id ?? null,
                responsibleUserId: body.responsible_user_id ?? null,
                success,
                error,
            })
        } catch (logError) {
            logger.error("LeadsService - changeStageAndResponsible - log event (ignored)", { domain, leadId, error: logError as Error })
        }
    }
}
