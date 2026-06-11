// Настройки автоперевода сделки для конкретного домена (amo-аккаунта).
// null = поле не задано и в amo при PATCH не отправляется.
export type LeadStageSettings = {
    domain: string
    targetStatusId: number | null
    targetPipelineId: number | null
    targetResponsibleUserId: number | null
}
