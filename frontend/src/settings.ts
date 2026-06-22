import {
    getApiKey,
    listIntegrations,
    getPipelines,
    getUsers,
    getLeadStageSettings,
    saveLeadStageSettings,
    setAmoToken,
    getActivity,
    changeLeadStage,
    type PipelineDTO,
    type UserDTO,
    type LeadStageSettingsDTO,
    type ActivityEventDTO,
} from "./api.js"

const domainSel = document.getElementById("settings-domain")
const statusSel = document.getElementById("settings-status")
const userSel = document.getElementById("settings-user")
const prioritySel = document.getElementById("settings-priority")
const templateInput = document.getElementById("settings-template")
const saveBtn = document.getElementById("settings-save")
const errEl = document.getElementById("settings-err")
const okEl = document.getElementById("settings-ok")

const testLeadInput = document.getElementById("test-lead-id")
const testRunBtn = document.getElementById("test-run")
const testErr = document.getElementById("test-err")
const testOk = document.getElementById("test-ok")
const activityList = document.getElementById("activity-list")

// ИИ-воронка (n8n)
const aiPipelineSel = document.getElementById("ai-pipeline")
const aiTriggerSel = document.getElementById("ai-trigger")
const aiResponsibleSel = document.getElementById("ai-responsible")
const aiAutoblockSel = document.getElementById("ai-autoblock")
const aiHandoffSel = document.getElementById("ai-handoff")
const aiSuccessSel = document.getElementById("ai-success")
const aiStartFieldInput = document.getElementById("ai-start-field")

// amoCRM Bearer-токен
const amoTokenInput = document.getElementById("amo-token")
const amoTokenSaveBtn = document.getElementById("amo-token-save")
const amoTokenErr = document.getElementById("amo-token-err")
const amoTokenOk = document.getElementById("amo-token-ok")

if (
    domainSel instanceof HTMLSelectElement &&
    statusSel instanceof HTMLSelectElement &&
    userSel instanceof HTMLSelectElement &&
    prioritySel instanceof HTMLSelectElement &&
    templateInput instanceof HTMLTextAreaElement &&
    saveBtn instanceof HTMLButtonElement
) {
    initSettings(domainSel, statusSel, userSel, prioritySel, templateInput, saveBtn)
}

function show(el: Element | null, message: string) {
    if (el instanceof HTMLElement) {
        el.hidden = false
        el.textContent = message
    }
}

function hide(el: Element | null) {
    if (el instanceof HTMLElement) {
        el.hidden = true
        el.textContent = ""
    }
}

function clearMessages() {
    hide(errEl)
    hide(okEl)
}

function option(value: string, label: string): HTMLOptionElement {
    const o = document.createElement("option")
    o.value = value
    o.textContent = label
    return o
}

// Наполняет select воронками/этапами. valueFor задаёт значение опции.
function fillStatusSelect(select: HTMLSelectElement, pipelines: PipelineDTO[], emptyLabel: string, valueFor: (pipelineId: number, statusId: number) => string) {
    select.replaceChildren(option("", emptyLabel))
    for (const p of pipelines) {
        const group = document.createElement("optgroup")
        group.label = p.name
        for (const s of p.statuses) {
            group.appendChild(option(valueFor(p.id, s.id), s.name))
        }
        select.appendChild(group)
    }
}

// Наполняет select воронками (value = id воронки).
function fillPipelineSelect(select: HTMLSelectElement, pipelines: PipelineDTO[], emptyLabel: string) {
    select.replaceChildren(option("", emptyLabel))
    for (const p of pipelines) {
        select.appendChild(option(String(p.id), p.name))
    }
}

// Наполняет select пользователями (value = id пользователя).
function fillUserSelect(select: HTMLSelectElement, users: UserDTO[], emptyLabel: string) {
    select.replaceChildren(option("", emptyLabel))
    for (const u of users) {
        select.appendChild(option(String(u.id), u.email ? `${u.name} (${u.email})` : u.name))
    }
}

// Заполняет поля ИИ-воронки и проставляет сохранённые значения.
function populateAiFields(pipelines: PipelineDTO[], users: UserDTO[], settings: LeadStageSettingsDTO) {
    if (aiPipelineSel instanceof HTMLSelectElement) {
        fillPipelineSelect(aiPipelineSel, pipelines, "— не задано —")
        aiPipelineSel.value = settings.ai_pipeline_id != null ? String(settings.ai_pipeline_id) : ""
    }

    const statusFields: [Element | null, number | null][] = [
        [aiTriggerSel, settings.ai_trigger_status_id],
        [aiAutoblockSel, settings.autoblock_status_id],
        [aiHandoffSel, settings.handoff_status_id],
        [aiSuccessSel, settings.success_status_id],
    ]
    for (const [el, val] of statusFields) {
        if (el instanceof HTMLSelectElement) {
            fillStatusSelect(el, pipelines, "— не задано —", (_p, s) => `${s}`)
            el.value = val != null ? String(val) : ""
        }
    }

    if (aiResponsibleSel instanceof HTMLSelectElement) {
        fillUserSelect(aiResponsibleSel, users, "— не задано —")
        aiResponsibleSel.value = settings.ai_responsible_user_id != null ? String(settings.ai_responsible_user_id) : ""
    }

    if (aiStartFieldInput instanceof HTMLInputElement) {
        aiStartFieldInput.value = settings.ai_start_time_field_id != null ? String(settings.ai_start_time_field_id) : ""
    }
}

// Считывает значения полей ИИ-воронки в payload (null, если не выбрано).
function readAiFields() {
    const num = (el: Element | null): number | null => {
        if (el instanceof HTMLSelectElement) return el.value ? Number(el.value) : null
        if (el instanceof HTMLInputElement) return el.value.trim() ? Number(el.value) : null
        return null
    }
    return {
        ai_pipeline_id: num(aiPipelineSel),
        ai_trigger_status_id: num(aiTriggerSel),
        ai_responsible_user_id: num(aiResponsibleSel),
        ai_start_time_field_id: num(aiStartFieldInput),
        autoblock_status_id: num(aiAutoblockSel),
        handoff_status_id: num(aiHandoffSel),
        success_status_id: num(aiSuccessSel),
    }
}

function initSettings(
    domain: HTMLSelectElement,
    status: HTMLSelectElement,
    user: HTMLSelectElement,
    priority: HTMLSelectElement,
    template: HTMLTextAreaElement,
    save: HTMLButtonElement,
) {
    domain.addEventListener("change", () => {
        if (domain.value) void loadForDomain(domain.value, status, user, priority, template, save)
    })

    save.addEventListener("click", () => {
        if (domain.value) void onSave(domain.value, status, user, priority, template, save)
    })

    if (testRunBtn instanceof HTMLButtonElement && testLeadInput instanceof HTMLInputElement) {
        testRunBtn.addEventListener("click", () => {
            if (domain.value) void onTest(domain.value, testLeadInput, testRunBtn)
        })
    }

    if (amoTokenSaveBtn instanceof HTMLButtonElement) {
        amoTokenSaveBtn.addEventListener("click", () => {
            if (domain.value) void onSaveToken(domain.value)
        })
    }

    void loadDomains(domain, status, user, priority, template, save)
}

async function loadDomains(
    domain: HTMLSelectElement,
    status: HTMLSelectElement,
    user: HTMLSelectElement,
    priority: HTMLSelectElement,
    template: HTMLTextAreaElement,
    save: HTMLButtonElement,
) {
    clearMessages()

    if (!getApiKey().trim()) {
        show(errEl, "Укажите API ключ выше, чтобы настроить этап.")
        return
    }

    try {
        const integrations = await listIntegrations()
        domain.replaceChildren()

        if (integrations.length === 0) {
            domain.appendChild(option("", "— нет подключённых аккаунтов —"))
            domain.disabled = true
            return
        }

        for (const it of integrations) {
            domain.appendChild(option(it.domain, it.active ? it.domain : `${it.domain} (выкл)`))
        }
        domain.disabled = false

        await loadForDomain(domain.value, status, user, priority, template, save)
    } catch (e) {
        show(errEl, (e as Error).message || "Не удалось загрузить список аккаунтов")
    }
}

async function loadForDomain(
    domain: string,
    status: HTMLSelectElement,
    user: HTMLSelectElement,
    priority: HTMLSelectElement,
    template: HTMLTextAreaElement,
    save: HTMLButtonElement,
) {
    clearMessages()
    save.disabled = true
    if (testRunBtn instanceof HTMLButtonElement) testRunBtn.disabled = true
    if (amoTokenSaveBtn instanceof HTMLButtonElement) amoTokenSaveBtn.disabled = true
    status.replaceChildren(option("", "Загрузка…"))
    user.replaceChildren(option("", "Загрузка…"))
    priority.replaceChildren(option("", "Загрузка…"))

    try {
        const [pipelines, users, settings] = await Promise.all([
            getPipelines(domain),
            getUsers(domain),
            getLeadStageSettings(domain),
        ])

        // Целевой этап: value = "pipelineId:statusId" (нужны оба для PATCH).
        fillStatusSelect(status, pipelines, "— не задано —", (p, s) => `${p}:${s}`)
        // Приоритетный этап: матчинг только по status_id.
        fillStatusSelect(priority, pipelines, "— не задано —", (_p, s) => `${s}`)

        // Ответственный: пустой вариант (не менять) + пользователи.
        fillUserSelect(user, users, "— не менять —")

        status.value =
            settings.pipeline_id != null && settings.status_id != null
                ? `${settings.pipeline_id}:${settings.status_id}`
                : ""
        user.value = settings.responsible_user_id != null ? String(settings.responsible_user_id) : ""
        priority.value = settings.priority_open_status_id != null ? String(settings.priority_open_status_id) : ""
        template.value = settings.comment_template ?? ""

        // Поля ИИ-воронки.
        populateAiFields(pipelines, users, settings)

        save.disabled = false
        if (testRunBtn instanceof HTMLButtonElement) testRunBtn.disabled = false
        if (amoTokenSaveBtn instanceof HTMLButtonElement) amoTokenSaveBtn.disabled = false

        await loadActivity(domain)
    } catch (e) {
        show(errEl, (e as Error).message || "Не удалось загрузить данные аккаунта")
    }
}

async function onSave(
    domain: string,
    status: HTMLSelectElement,
    user: HTMLSelectElement,
    priority: HTMLSelectElement,
    template: HTMLTextAreaElement,
    save: HTMLButtonElement,
) {
    clearMessages()
    save.disabled = true

    let statusId: number | null = null
    let pipelineId: number | null = null
    if (status.value) {
        const [p, s] = status.value.split(":")
        pipelineId = Number(p)
        statusId = Number(s)
    }
    const responsibleUserId = user.value ? Number(user.value) : null
    const priorityOpenStatusId = priority.value ? Number(priority.value) : null
    const commentTemplate = template.value.trim() ? template.value.trim() : null

    try {
        await saveLeadStageSettings(domain, {
            status_id: statusId,
            pipeline_id: pipelineId,
            responsible_user_id: responsibleUserId,
            priority_open_status_id: priorityOpenStatusId,
            comment_template: commentTemplate,
            ...readAiFields(),
        })
        show(okEl, "Сохранено.")
    } catch (e) {
        show(errEl, (e as Error).message || "Не удалось сохранить настройки")
    } finally {
        save.disabled = false
    }
}

async function onSaveToken(domain: string) {
    if (!(amoTokenInput instanceof HTMLInputElement) || !(amoTokenSaveBtn instanceof HTMLButtonElement)) return
    hide(amoTokenErr)
    hide(amoTokenOk)

    const token = amoTokenInput.value.trim()
    if (!token) {
        show(amoTokenErr, "Введите токен.")
        return
    }

    amoTokenSaveBtn.disabled = true
    try {
        await setAmoToken(domain, token)
        amoTokenInput.value = ""
        show(amoTokenOk, "Токен сохранён.")
    } catch (e) {
        show(amoTokenErr, (e as Error).message || "Не удалось сохранить токен")
    } finally {
        amoTokenSaveBtn.disabled = false
    }
}

async function onTest(domain: string, leadInput: HTMLInputElement, run: HTMLButtonElement) {
    hide(testErr)
    hide(testOk)

    const leadId = Number(leadInput.value)
    if (!Number.isInteger(leadId) || leadId <= 0) {
        show(testErr, "Укажите корректный ID сделки.")
        return
    }

    run.disabled = true
    try {
        await changeLeadStage(domain, leadId)
        show(testOk, `Сделка ${leadId}: этап обновлён.`)
        await loadActivity(domain)
    } catch (e) {
        show(testErr, (e as Error).message || "Не удалось сменить этап")
        await loadActivity(domain)
    } finally {
        run.disabled = false
    }
}

async function loadActivity(domain: string) {
    if (!(activityList instanceof HTMLElement)) return
    activityList.replaceChildren()

    try {
        const events = await getActivity(domain)
        if (events.length === 0) {
            const p = document.createElement("p")
            p.className = "muted-empty"
            p.textContent = "Пока нет записей."
            activityList.appendChild(p)
            return
        }
        for (const e of events) {
            activityList.appendChild(renderEvent(e))
        }
    } catch {
        const p = document.createElement("p")
        p.className = "muted-empty"
        p.textContent = "Не удалось загрузить журнал."
        activityList.appendChild(p)
    }
}

function sourceLabel(source: ActivityEventDTO["source"]): string {
    switch (source) {
        case "wazup": return "вебхук"
        case "ai": return "ИИ"
        case "pact": return "pact"
        default: return "вручную"
    }
}

function renderEvent(e: ActivityEventDTO): HTMLElement {
    const row = document.createElement("div")
    row.className = "row"

    const main = document.createElement("div")
    main.className = "row-main"
    const title = document.createElement("div")
    title.className = "row-domain"
    const label = sourceLabel(e.source)
    title.textContent = e.lead_id != null ? `Сделка ${e.lead_id} · ${label}` : `— · ${label}`
    const sub = document.createElement("div")
    sub.className = "row-sub"
    const when = new Date(e.created_at).toLocaleString()
    sub.textContent = e.success ? when : `${when} — ${e.error ?? "ошибка"}`
    main.append(title, sub)

    const badge = document.createElement("span")
    badge.className = `badge ${e.success ? "ok" : "err"}`
    badge.textContent = e.success ? "успех" : (e.source !== "manual" ? "пропуск/ошибка" : "ошибка")

    row.append(main, badge)
    return row
}
