import { getApiKey, listIntegrations, setIntegrationActive, checkHealth, disconnectIntegration } from "./api.js"

const listEl = document.getElementById("accounts-list")
const errEl = document.getElementById("accounts-err")

if (listEl instanceof HTMLElement) {
    void renderAccounts(listEl)
}

function showErr(message: string) {
    if (errEl instanceof HTMLElement) {
        errEl.hidden = false
        errEl.textContent = message
    }
}

function clearErr() {
    if (errEl instanceof HTMLElement) {
        errEl.hidden = true
        errEl.textContent = ""
    }
}

async function renderAccounts(list: HTMLElement) {
    clearErr()
    list.replaceChildren()

    if (!getApiKey().trim()) {
        const p = document.createElement("p")
        p.className = "muted-empty"
        p.textContent = "Укажите API ключ выше, чтобы увидеть аккаунты."
        list.appendChild(p)
        return
    }

    try {
        const integrations = await listIntegrations()
        if (integrations.length === 0) {
            const p = document.createElement("p")
            p.className = "muted-empty"
            p.textContent = "Нет подключённых аккаунтов."
            list.appendChild(p)
            return
        }
        for (const it of integrations) {
            list.appendChild(renderRow(list, it.domain, it.active))
        }
    } catch (e) {
        showErr((e as Error).message || "Не удалось загрузить аккаунты")
    }
}

function renderRow(list: HTMLElement, domain: string, active: boolean): HTMLElement {
    const row = document.createElement("div")
    row.className = "row"

    const main = document.createElement("div")
    main.className = "row-main"
    const name = document.createElement("div")
    name.className = "row-domain"
    name.textContent = domain
    const sub = document.createElement("div")
    sub.className = "row-sub"
    main.append(name, sub)

    // тумблер active
    const toggle = document.createElement("label")
    toggle.className = "switch"
    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.checked = active
    const slider = document.createElement("span")
    slider.className = "slider"
    toggle.append(checkbox, slider)

    checkbox.addEventListener("change", async () => {
        clearErr()
        checkbox.disabled = true
        try {
            await setIntegrationActive(domain, checkbox.checked)
        } catch (e) {
            checkbox.checked = !checkbox.checked // откатываем визуально
            showErr((e as Error).message || "Не удалось изменить статус")
        } finally {
            checkbox.disabled = false
        }
    })

    // проверка связи
    const healthBtn = document.createElement("button")
    healthBtn.type = "button"
    healthBtn.className = "btn-mini"
    healthBtn.textContent = "Проверить"
    healthBtn.addEventListener("click", async () => {
        healthBtn.disabled = true
        sub.textContent = "Проверка…"
        try {
            const result = await checkHealth(domain)
            sub.replaceChildren()
            const badge = document.createElement("span")
            badge.className = `badge ${result.ok ? "ok" : "err"}`
            badge.textContent = result.ok ? "связь ок" : "нужно переподключить"
            sub.appendChild(badge)
        } catch (e) {
            sub.textContent = (e as Error).message || "Ошибка проверки"
        } finally {
            healthBtn.disabled = false
        }
    })

    // отключение интеграции
    const disconnectBtn = document.createElement("button")
    disconnectBtn.type = "button"
    disconnectBtn.className = "btn-mini danger"
    disconnectBtn.textContent = "Отключить"
    disconnectBtn.addEventListener("click", async () => {
        if (!confirm(`Отключить интеграцию ${domain}? Аккаунт перестанет обрабатываться.`)) return
        disconnectBtn.disabled = true
        clearErr()
        try {
            await disconnectIntegration(domain)
            await renderAccounts(list) // перерисовываем — отключённый пропадёт из списка
        } catch (e) {
            disconnectBtn.disabled = false
            showErr((e as Error).message || "Не удалось отключить интеграцию")
        }
    })

    row.append(main, healthBtn, disconnectBtn, toggle)
    return row
}
