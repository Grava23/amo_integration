import type { FastifyReply, FastifyRequest } from "fastify"
import { config } from "../../config.js"
import { AuthRepo } from "./repo.js"
import { AuthService } from "./service.js"
import { CompleteOauthQuery } from "./schema.js"

function isBrowserNavigation(req: FastifyRequest): boolean {
    if (req.headers["sec-fetch-mode"] === "navigate") return true
    const accept = req.headers.accept ?? ""
    return accept.includes("text/html") && !accept.includes("application/json")
}

function redirectToFrontend(reply: FastifyReply, query: Record<string, string>) {
    const qs = new URLSearchParams(query).toString()
    const base = config.FRONTEND_ORIGIN.replace(/\/$/, "")
    const path = qs ? `/oauth/callback/?${qs}` : "/oauth/callback/"
    return reply.redirect(`${base}${path}`)
}

function wantsJsonResponse(req: FastifyRequest): boolean {
    const accept = req.headers.accept ?? ""
    return accept.includes("application/json")
}

export async function startOauthController(req: FastifyRequest, reply: FastifyReply) {
    const repo = new AuthRepo(req.server.prisma)
    const service = new AuthService(repo, req.server.amoClient)

    try {
        const authorizeUrl = await service.start()

        if (wantsJsonResponse(req)) {
            return reply.send({ authorizeUrl })
        }

        return await reply.redirect(authorizeUrl)
    } catch (error) {
        return await reply.status(500).send({
            message: "Internal server error",
            error: (error as Error).message,
        })
    }
}

export async function completeOauthController(
    req: FastifyRequest<{ Querystring: CompleteOauthQuery }>,
    reply: FastifyReply,
) {
    const { state, code, referer, error } = req.query

    if (error) {
        if (isBrowserNavigation(req)) {
            return redirectToFrontend(reply, { error })
        }
        return reply.status(403).send({ error, message: "OAuth denied or failed" })
    }

    if (!state || !code) {
        const message = "Missing code or state in OAuth callback"
        if (isBrowserNavigation(req)) {
            return redirectToFrontend(reply, { error: "missing_params" })
        }
        return reply.status(400).send({ message })
    }

    const repo = new AuthRepo(req.server.prisma)
    const service = new AuthService(repo, req.server.amoClient)

    const runComplete = () => {
        void service.completeOauth(state, code, referer ?? "").catch((err) => {
            req.log.error({ err }, "completeOauthController - background processing failed")
        })
    }

    if (isBrowserNavigation(req)) {
        runComplete()
        return redirectToFrontend(reply, { pending: "1" })
    }

    runComplete()
    return reply.status(202).send({ message: "Accepted" })
}
