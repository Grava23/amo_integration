export type Integration = {
    domain: string
    accessToken: string
    refreshToken: string
    amojoID: string
    scopeID: string
    active: boolean
    // Статичный долгоживущий Bearer-токен amoCRM (как в n8n). null — используется
    // старый OAuth-поток с рефрешем. Если задан — amo-вызовы идут с ним без рефреша.
    amoApiToken: string | null
}
