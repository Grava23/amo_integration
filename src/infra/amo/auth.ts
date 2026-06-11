import { z } from "zod"
import type { AmoClient } from "./client.js"
import { config } from "../../config.js"

// ---- Request params ----
export type GetAccessTokenRequest = {
    client_id: string
    client_secret: string
    grant_type: string
    code: string
    redirect_uri: string
}

export type RefreshTokenRequest = {
    client_id: string
    client_secret: string
    grant_type: string
    refresh_token: string
    redirect_uri: string
}

// ---- Response types ----
export type GetAccessTokenResponse = {
    token_type: string
    expires_in: number
    access_token: string
    refresh_token: string
}

// ---- API ----
export function createAuthAPI(client: AmoClient) {
    return {
        async getAccessToken(code: string, domain: string): Promise<GetAccessTokenResponse> {
            const url = new URL(`https://${domain}/oauth2/access_token`)

            const body: GetAccessTokenRequest = {
                client_id: config.AMO_CLIENT_ID,
                client_secret: config.AMO_CLIENT_SECRET,
                grant_type: "authorization_code",
                code: code,
                redirect_uri: config.AMO_REDIRECT_URI,
            }

            const request = new Request(url, {
                method: "POST",
                body: JSON.stringify(body),
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            })

            const response = await client.request<GetAccessTokenResponse>(request)

            return response
        },

        async refreshToken(refreshToken: string, domain: string): Promise<GetAccessTokenResponse> {
            const url = new URL(`https://${domain}/oauth2/access_token`)

            const body: RefreshTokenRequest = {
                client_id: config.AMO_CLIENT_ID,
                client_secret: config.AMO_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                redirect_uri: config.AMO_REDIRECT_URI,
            }

            const request = new Request(url, {
                method: "POST",
                body: JSON.stringify(body),
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            })

            const response = await client.request<GetAccessTokenResponse>(request)

            return response
        }
    }
}
