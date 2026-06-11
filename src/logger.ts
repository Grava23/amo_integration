import pino from "pino"

const transport = pino.transport({
    target: "pino-pretty",
    options: {
        colorize: true,
        translateTime: "dd-mm-yyyy HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: true,
    },
})

const baseLogger = pino({ level: "debug" }, transport)

type Params = Record<string, unknown> | undefined

export const logger = {
    info: (msg: string, params?: Params) =>
        baseLogger.info({ msg, ...params }),
    error: (msg: string, params?: Params) =>
        baseLogger.error({ msg, ...params }),
    warn: (msg: string, params?: Params) =>
        baseLogger.warn({ msg, ...params }),
    debug: (msg: string, params?: Params) =>
        baseLogger.debug({ msg, ...params }),
}