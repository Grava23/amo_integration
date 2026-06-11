import { apiFetch } from "./api.js"

const root = document.getElementById("root")
if (!(root instanceof HTMLElement)) {
    throw new Error("missing #root")
}

const params = new URLSearchParams(location.search)

function show(title: string, message: string, ok: boolean) {
    root.innerHTML =
        `<h1>${title}</h1>` +
        `<p class="${ok ? "ok" : "err"}">${message}</p>` +
        `<a class="btn secondary" href="/">На главную</a>`
}

if (params.get("pending") === "1") {
    show(
        "Подключение запущено",
        "Бэкенд получил code от amoCRM и настраивает интеграцию в фоне. Подождите 1–2 минуты и проверьте данные в системе.",
        true,
    )
} else if (params.get("error") === "access_denied") {
    show("Отменено", "Вы отказали приложению в доступе к amoCRM.", false)
} else if (params.get("error") === "missing_params") {
    show("Ошибка", "В адресе нет code или state.", false)
} else if (params.get("error")) {
    show("Ошибка", params.get("error")!, false)
} else {
    const state = params.get("state")
    const code = params.get("code")
    const referer = params.get("referer") ?? ""

    if (!state || !code) {
        show("Ошибка", "В адресе нет параметров code или state.", false)
    } else {
        const qs = new URLSearchParams({ state, code, referer })
        apiFetch(`/api/v1/auth/oauth/complete?${qs.toString()}`)
            .then(async (res) => {
                const body = (await res.json().catch(() => ({}))) as {
                    message?: string
                    error?: string
                }
                if (!res.ok) {
                    show("Ошибка", body.message || body.error || `HTTP ${res.status}`, false)
                    return
                }
                show(
                    "Готово",
                    "Интеграция принята и настраивается в фоне. Через минуту данные из amoCRM должны появиться в системе.",
                    true,
                )
            })
            .catch((e: Error) => {
                show("Ошибка", e.message || "Не удалось связаться с сервером", false)
            })
    }
}
