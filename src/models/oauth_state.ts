export type OAuthState = {
    state: string
    expiredAt: Date
    used: boolean
}