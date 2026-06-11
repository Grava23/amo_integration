import type { AmoClient } from "./client.js"

export function createAccountAPI(client: AmoClient) {
    return {
        async getAmojoID(domain: string, accessToken: string): Promise<string> {
            const url = new URL(`https://${domain}/api/v4/account`)
            url.searchParams.set("with", "amojo_id")

            const request = new Request(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json",
                },
            })

            const response = await client.request<{ amojo_id: string }>(request)
            return response.amojo_id
        }
    }
}