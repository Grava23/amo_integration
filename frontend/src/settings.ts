import {
    getApiKey,
    listIntegrations,
    getPipelines,
    getUsers,
    getLeadStageSettings,
    saveLeadStageSettings,
} from "./api.js"

const domainSel = document.getElementById("settings-domain")
const statusSel = document.getElementById("settings-status")
const userSel = document.getElementById("settings-user")
const saveBtn = document.getElementById("settings-save")
const errEl = document.getElementById("settings-err")
const okEl = document.getElementById("settings-ok")

// Рендерим форму, только если вся разметка на месте.
if (
    domainSel instanceof HTMLSelectElement &&
    statusSel instanceof HTMLSelectElement &&
    userSel instanceof HTMLSelectElement &&
    saveBtn instanceof HTMLButtonElement
) {
    initSettings(domainSel, statusSel, userSel, saveBtn)
}

function showErr(message: string) {
    if (errEl instanceof HTMLElement) {
        errEl.hidden = false
        errEl.textContent = message
    }
}

function clearMessages() {
    if (errEl instanceof HTMLElement) {
        errEl.hidden = true
        errEl.textContent = ""
    }
    if (okEl instanceof HTMLElement) {
        okEl.hidden = true
        okEl.textContent = ""
    }
}

function showOk(message: string) {
    if (okEl instanceof HTMLElement) {
        okEl.hidden = false
        okEl.textContent = message
    }
}

function option(value: string, label: string): HTMLOptionElement {
    const o = document.createElement("option")
    o.value = value
    o.textContent = label
    return o
}

function initSettings(
    domain: HTMLSelectElement,
    status: HTMLSelectElement,
    user: HTMLSelectElement,
    save: HTMLButtonElement,
) {
    domain.addEventListener("change", () => {
        if (domain.value) void loadForDomain(domain.value, status, user, save)
    })

    save.addEventListener("click", () => {
        if (domain.value) void onSave(domain.value, status, user, save)
    })

    void loadDomains(domain, status, user, save)
}

async function loadDomains(
    domain: HTMLSelectElement,
    status: HTMLSelectElement,
    user: HTMLSelectElement,
    save: HTMLButtonElement,
) {
    clearMessages()

    if (!getApiKey().trim()) {
        showErr("Укажите API ключ выше, чтобы настроить этап.")
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

        await loadForDomain(domain.value, status, user, save)
    } catch (e) {
        showErr((e as Error).message || "Не удалось загрузить список аккаунтов")
    }
}

async function loadForDomain(
    domain: string,
    status: HTMLSelectElement,
    user: HTMLSelectElement,
    save: HTMLButtonElement,
) {
    clearMessages()
    save.disabled = true
    status.replaceChildren(option("", "Загрузка…"))
    user.replaceChildren(option("", "Загрузка…"))

    try {
        const [pipelines, users, settings] = await Promise.all([
            getPipelines(domain),
            getUsers(domain),
            getLeadStageSettings(domain),
        ])

        // Этапы: пустой вариант + optgroup на каждую воронку, value = "pipelineId:statusId".
        status.replaceChildren(option("", "— не задано —"))
        for (const p of pipelines) {
            const group = document.createElement("optgroup")
            group.label = p.name
            for (const s of p.statuses) {
                group.appendChild(option(`${p.id}:${s.id}`, s.name))
            }
            status.appendChild(group)
        }

        // Ответственный: пустой вариант (не менять) + пользователи.
        user.replaceChildren(option("", "— не менять —"))
        for (const u of users) {
            user.appendChild(option(String(u.id), u.email ? `${u.name} (${u.email})` : u.name))
        }

        status.value =
            settings.pipeline_id != null && settings.status_id != null
                ? `${settings.pipeline_id}:${settings.status_id}`
                : ""
        user.value = settings.responsible_user_id != null ? String(settings.responsible_user_id) : ""

        save.disabled = false
    } catch (e) {
        showErr((e as Error).message || "Не удалось загрузить данные аккаунта")
    }
}

async function onSave(
    domain: string,
    status: HTMLSelectElement,
    user: HTMLSelectElement,
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

    try {
        await saveLeadStageSettings(domain, {
            status_id: statusId,
            pipeline_id: pipelineId,
            responsible_user_id: responsibleUserId,
        })
        showOk("Сохранено.")
    } catch (e) {
        showErr((e as Error).message || "Не удалось сохранить настройки")
    } finally {
        save.disabled = false
    }
}
