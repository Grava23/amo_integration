export type LeadEventSource = "manual" | "wazup" | "pact" | "ai"

// Запись журнала обработки сделки (ручная смена этапа или wazup-вебхук).
export type LeadStageEvent = {
    id: number
    domain: string
    source: LeadEventSource
    leadId: number | null
    statusId: number | null
    pipelineId: number | null
    responsibleUserId: number | null
    success: boolean
    error: string | null
    createdAt: Date
}

// Данные для создания записи (без id/createdAt — их проставляет БД).
export type LeadStageEventInput = {
    domain: string
    source: LeadEventSource
    leadId: number | null
    statusId: number | null
    pipelineId: number | null
    responsibleUserId: number | null
    success: boolean
    error: string | null
}
