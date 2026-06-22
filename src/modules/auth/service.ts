import { randomUUID } from "node:crypto"
import { config } from "../../config.js"
import { AuthRepo } from "./repo.js"
import { logger } from "../../logger.js"
import type { Integration } from "../../models/integration.js"
import { AmoClient } from "../../infra/amo/client.js"
import { withAmoTokenRefresh } from "../../infra/amo/with_token_refresh.js"

export class AuthService {
  constructor(private authRepo: AuthRepo, private amoClient: AmoClient) { }

  async start(): Promise<string> {
    const state = randomUUID()
    const expiredAt = new Date(Date.now() + 10 * 60 * 1000)

    try {
      await this.authRepo.createOauthState({ state, expiredAt, used: false })
    } catch (error) {
      logger.error("AuthService - start - create oauth state", { error: error as Error })
      throw new Error(`AuthService - start - create oauth state: ${error as Error}`)
    }

    if (!config.AMO_REDIRECT_URI) {
      logger.warn(
        "AuthService - start - AMO_REDIRECT_URI пустой: укажите тот же Redirect URI, что в настройках интеграции amoCRM",
      )
    }

    const authorizeUrl = new URL(config.AMO_OAUTH_URL)
    authorizeUrl.searchParams.set("client_id", config.AMO_CLIENT_ID)
    authorizeUrl.searchParams.set("state", state)

    logger.debug("AuthService - start - authorize url", {
      authorizeUrl: authorizeUrl.toString(),
      amoRedirectUri: config.AMO_REDIRECT_URI,
    })
    return authorizeUrl.toString()
  }

  async completeOauth(state: string, code: string, referer: string) {
    try {
      await this.authRepo.consumeOauthState(state)
    } catch (error) {
      logger.error("AuthService - completeOauth - consume oauth state", { error: error as Error })
      throw new Error(`AuthService - completeOauth - consume oauth state: ${error as Error}`)
    }

    let integration: Integration = {
      domain: "",
      accessToken: "",
      refreshToken: "",
      amojoID: "",
      scopeID: "",
      active: true,
      amoApiToken: null,
    }
    try {
      integration = await this.authRepo.getIntegrationByDomain(referer)
    } catch (e: any) {
      if (e.code === "P2025") {
        integration = {
          domain: "",
          accessToken: "",
          refreshToken: "",
          amojoID: "",
          scopeID: "",
          active: true,
          amoApiToken: null,
        }
      } else {
        logger.error("AuthService - completeOauth - get integration by domain", { error: e as Error })
        throw new Error(`AuthService - completeOauth - get integration by domain: ${e as Error}`)
      }
    }

    let domain = integration.domain ?? ""
    if (referer !== "") {
      referer = referer.replace("https://", "").replace("http://", "").replace("/", "")

      if (referer.includes(".amocrm.ru") || referer.includes(".amocrm.com")) {
        domain = referer
      }
    }

    integration.domain = domain

    try {
      const accessToken = await this.amoClient.auth.getAccessToken(code, domain)

      integration.accessToken = accessToken.access_token
      integration.refreshToken = accessToken.refresh_token
    } catch (error) {
      logger.error("AuthService - completeOauth - get access token", { error: error as Error })
      throw new Error(`AuthService - completeOauth - get access token: ${error as Error}`)
    }

    const amojoID = await withAmoTokenRefresh(
      integration,
      this.authRepo,
      this.amoClient.auth,
      (accessToken) => this.amoClient.account.getAmojoID(domain, accessToken)
    )

    integration.amojoID = amojoID

    try {
      await this.authRepo.upsertIntegration(integration)
    } catch (error) {
      logger.error("AuthService - completeOauth - upsert integration", { error: error as Error })
      throw new Error(`AuthService - completeOauth - upsert integration: ${error as Error}`)
    }
  }
}
