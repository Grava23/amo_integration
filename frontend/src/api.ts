const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8080"

const API_KEY_STORAGE = "amo_crm_api_key"

export function apiUrl(path: string): string {
    return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export function getApiKey(): string {
    try {
        return localStorage.getItem(API_KEY_STORAGE) ?? ""
    } catch {
        return ""
    }
}

export function setApiKey(key: string): void {
    try {
        const trimmed = key.trim()
        if (trimmed) localStorage.setItem(API_KEY_STORAGE, trimmed)
        else localStorage.removeItem(API_KEY_STORAGE)
    } catch {
        /* ignore */
    }
}

export function apiHeaders(): Record<string, string> {
    const key = getApiKey().trim()
    if (!key) return {}
    return { "x-api-key": key }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers)
    for (const [name, value] of Object.entries(apiHeaders())) {
        if (!headers.has(name)) headers.set(name, value)
    }
    return fetch(apiUrl(path), { ...init, headers })
}

// ---- Типы ответов бэкенда ----
export type IntegrationListItem = { domain: string; active: boolean }
export type PipelineDTO = { id: number; name: string; statuses: { id: number; name: string }[] }
export type UserDTO = { id: number; name: string; email: string }
export type LeadStageSettingsDTO = {
    domain: string
    status_id: number | null
    pipeline_id: number | null
    responsible_user_id: number | null
}

async function readJson<T>(res: Response): Promise<T> {
    const body = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string }
    if (!res.ok) {
        throw new Error(body.error || body.message || `Ошибка ${res.status}`)
    }
    return body
}

export async function listIntegrations(): Promise<IntegrationListItem[]> {
    const res = await apiFetch("/api/v1/integration", { headers: { Accept: "application/json" } })
    const body = await readJson<{ integrations: IntegrationListItem[] }>(res)
    return body.integrations
}

export async function getPipelines(domain: string): Promise<PipelineDTO[]> {
    const res = await apiFetch(`/api/v1/integration/${encodeURIComponent(domain)}/pipelines`, { headers: { Accept: "application/json" } })
    const body = await readJson<{ pipelines: PipelineDTO[] }>(res)
    return body.pipelines
}

export async function getUsers(domain: string): Promise<UserDTO[]> {
    const res = await apiFetch(`/api/v1/integration/${encodeURIComponent(domain)}/users`, { headers: { Accept: "application/json" } })
    const body = await readJson<{ users: UserDTO[] }>(res)
    return body.users
}

export async function getLeadStageSettings(domain: string): Promise<LeadStageSettingsDTO> {
    const res = await apiFetch(`/api/v1/integration/${encodeURIComponent(domain)}/lead-stage-settings`, { headers: { Accept: "application/json" } })
    return readJson<LeadStageSettingsDTO>(res)
}

export async function saveLeadStageSettings(
    domain: string,
    body: { status_id: number | null; pipeline_id: number | null; responsible_user_id: number | null },
): Promise<LeadStageSettingsDTO> {
    const res = await apiFetch(`/api/v1/integration/${encodeURIComponent(domain)}/lead-stage-settings`, {
        method: "PUT",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    return readJson<LeadStageSettingsDTO>(res)
}
