import { describe, it, expect, vi, afterEach, inject } from "vitest"

describe("run() lifecycle (real DB)", () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it("слушает порт, регистрирует SIGINT/SIGTERM и корректно завершается по сигналу", async () => {
        process.env.DATABASE_URL = inject("databaseUrl")
        const prevPort = process.env.PORT
        process.env.PORT = "0" // эфемерный свободный порт — без коллизий

        // config парсится при импорте — сбрасываем модули, чтобы PORT=0 применился
        vi.resetModules()

        const handlers: Record<string, (...args: any[]) => any> = {}
        const origOn = process.on.bind(process)
        vi.spyOn(process, "on").mockImplementation(((event: any, handler: any) => {
            if (event === "SIGINT" || event === "SIGTERM") {
                handlers[event] = handler
                return process
            }
            return origOn(event, handler)
        }) as any)
        const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as any)

        const { run } = await import("../../src/app.js")
        await run()

        // сервер поднялся и зарегистрировал обработчики сигналов
        expect(handlers.SIGINT).toBeTypeOf("function")
        expect(handlers.SIGTERM).toBeTypeOf("function")

        // имитируем сигнал — graceful shutdown закрывает сервер и "выходит" (process.exit замокан)
        await handlers.SIGTERM!()
        expect(exitSpy).toHaveBeenCalledWith(0)

        process.env.PORT = prevPort
    })
})
