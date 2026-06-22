// Настройки автоперевода сделки для конкретного домена (amo-аккаунта).
// null = поле не задано и в amo при PATCH не отправляется.
export type LeadStageSettings = {
    domain: string
    targetStatusId: number | null
    targetPipelineId: number | null
    targetResponsibleUserId: number | null
    // Этап, по которому выбираем сделку при нескольких открытых (wazup-вебхук)
    priorityOpenStatusId: number | null
    // Текст заметки по умолчанию, если в запросе addComment не передан text
    commentTemplate: string | null
    // --- ИИ-воронка (n8n): все ID хранятся в БД per-domain ---
    aiPipelineId: number | null
    aiTriggerStatusId: number | null
    aiResponsibleUserId: number | null
    aiStartTimeFieldId: number | null
    autoblockStatusId: number | null
    handoffStatusId: number | null
    successStatusId: number | null
}

// Строка таблицы integration_settings (snake_case из Prisma).
export type IntegrationSettingsRow = {
    domain: string
    target_status_id: number | null
    target_pipeline_id: number | null
    target_responsible_user_id: number | null
    priority_open_status_id: number | null
    comment_template: string | null
    ai_pipeline_id: number | null
    ai_trigger_status_id: number | null
    ai_responsible_user_id: number | null
    ai_start_time_field_id: number | null
    autoblock_status_id: number | null
    handoff_status_id: number | null
    success_status_id: number | null
}

// Единый маппер строки БД → доменная модель (используется во всех репозиториях).
export function toLeadStageSettings(row: IntegrationSettingsRow): LeadStageSettings {
    return {
        domain: row.domain,
        targetStatusId: row.target_status_id,
        targetPipelineId: row.target_pipeline_id,
        targetResponsibleUserId: row.target_responsible_user_id,
        priorityOpenStatusId: row.priority_open_status_id,
        commentTemplate: row.comment_template,
        aiPipelineId: row.ai_pipeline_id,
        aiTriggerStatusId: row.ai_trigger_status_id,
        aiResponsibleUserId: row.ai_responsible_user_id,
        aiStartTimeFieldId: row.ai_start_time_field_id,
        autoblockStatusId: row.autoblock_status_id,
        handoffStatusId: row.handoff_status_id,
        successStatusId: row.success_status_id,
    }
}
