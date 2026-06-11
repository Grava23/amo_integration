import { apiFetch, getApiKey, setApiKey } from "./api.js"
import "./settings.js"

const apiKeyInput = document.getElementById("api-key")
if (apiKeyInput instanceof HTMLInputElement) {
    apiKeyInput.value = getApiKey()
    apiKeyInput.addEventListener("input", () => {
        setApiKey(apiKeyInput.value)
    })
}

const loginErr = document.getElementById("login-err")
const login = document.getElementById("login")

function showLoginError(message: string) {
    if (!(loginErr instanceof HTMLElement)) return
    loginErr.hidden = false
    loginErr.textContent = message
}

function clearLoginError() {
    if (!(loginErr instanceof HTMLElement)) return
    loginErr.hidden = true
    loginErr.textContent = ""
}

if (login instanceof HTMLButtonElement) {
    login.addEventListener("click", async () => {
        clearLoginError()

        if (!getApiKey().trim()) {
            showLoginError("Укажите API ключ (SERVER_API_KEY с бэка).")
            return
        }

        login.disabled = true
        try {
            const res = await apiFetch("/api/v1/auth/oauth/start", {
                headers: { Accept: "application/json" },
            })
            const body = (await res.json().catch(() => ({}))) as {
                authorizeUrl?: string
                error?: string
                message?: string
            }

            if (!res.ok) {
                showLoginError(body.error || body.message || `Ошибка ${res.status}`)
                return
            }

            if (!body.authorizeUrl) {
                showLoginError("Сервер не вернул ссылку авторизации.")
                return
            }

            location.href = body.authorizeUrl
        } catch (e) {
            showLoginError((e as Error).message || "Не удалось связаться с сервером")
        } finally {
            login.disabled = false
        }
    })
}

const params = new URLSearchParams(location.search)
if (params.get("oauth") === "success") {
    const card = document.querySelector(".card")
    if (card) {
        const p = document.createElement("p")
        p.className = "ok"
        p.textContent = "Интеграция подключена (или настраивается в фоне)."
        card.appendChild(p)
    }
}
