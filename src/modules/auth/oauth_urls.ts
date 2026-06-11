import { config } from "../../config.js"

export function apiPublicOrigin(): string {
    if (config.API_PUBLIC_URL) {
        return config.API_PUBLIC_URL.replace(/\/$/, "")
    }
    return `http://localhost:${config.PORT}`
}

/** URL, который нужно указать в amoCRM → Redirect URI и в AMO_REDIRECT_URI */
export function recommendedOauthRedirectUri(): string {
    return `${apiPublicOrigin()}/api/v1/auth/oauth/complete`
}
