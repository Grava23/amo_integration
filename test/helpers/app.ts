import Fastify, { FastifyInstance } from "fastify"
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"
import qs from "qs"

/**
 * Создаёт Fastify-приложение так же, как боевой init() в src/app.ts
 * (zod-компиляторы + парсер x-www-form-urlencoded), но без listen,
 * и декорирует prisma/amoClient переданными фейками.
 *
 * Роуты/плагины регистрирует уже вызывающий код, после чего нужно дождаться app.ready().
 */
export function buildApp(opts: { prisma?: unknown; amoClient?: unknown } = {}): FastifyInstance {
    const app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    app.addContentTypeParser(
        "application/x-www-form-urlencoded",
        { parseAs: "string" },
        (_req, body, done) => {
            done(null, qs.parse(body as string))
        },
    )

    if (opts.prisma !== undefined) app.decorate("prisma", opts.prisma as never)
    if (opts.amoClient !== undefined) app.decorate("amoClient", opts.amoClient as never)

    return app
}

/** Фейковый amoClient с jest/vi-моками на нужные методы. Доукомплектовывай в тестах. */
export function makeAmoClientStub(overrides: Record<string, unknown> = {}) {
    return {
        auth: { getAccessToken: () => {}, refreshToken: () => {} },
        account: { getAmojoID: () => {} },
        contact: { getContacts: () => {}, getContact: () => {} },
        leads: { getLead: () => {}, getLeads: () => {}, updateLead: () => {}, getPipelines: () => {} },
        notes: { addNotesByEntityTypeAndID: () => {}, getNotesByEntityTypeAndID: () => {} },
        users: { getUserByID: () => {}, getUsers: () => {} },
        customFields: { getCustomFields: () => {} },
        ...overrides,
    }
}
