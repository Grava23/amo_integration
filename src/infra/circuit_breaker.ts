export class CircuitBreaker {

    private states = new Map<string, { failures: number; lastFailure: number; state: "closed" | "open" }>()
    private callsSinceSweep = 0

    constructor(
        private threshold = 5,
        private cooldown = 10000,
        private stateTtlMs = 30 * 60 * 1000, // 30 минут
        private sweepEveryCalls = 200
    ) { }

    private getState(key: string) {
        let s = this.states.get(key)
        if (!s) {
            s = { failures: 0, lastFailure: 0, state: "closed" }
            this.states.set(key, s)
        }
        return s
    }

    private sweepStates(now = Date.now()) {
        for (const [key, s] of this.states) {
            const isIdle = now - s.lastFailure > this.stateTtlMs
            const isHealthy = s.state === "closed" && s.failures === 0
            if (isIdle && isHealthy) {
                this.states.delete(key)
            }
        }
    }

    private isRetriableFailure(err: unknown): boolean {
        const msg = (err as any)?.message ? String((err as any).message) : ""

        // 429 (rate limit) — временный, хотя формально 4xx: проверяем ДО общего гарда на 4xx.
        if (msg.startsWith("HTTP 429")) return true

        // Остальные 4xx обычно постоянные (403/400) и не должны открывать брейкер.
        if (msg.startsWith("HTTP 4")) return false

        // 5xx/сеть — временные, их можно считать сигналом для брейкера.
        if (msg.startsWith("HTTP 5")) return true
        if (msg.startsWith("HTTP_RETRYABLE_")) return true

        // node-fetch/undici/network ошибки часто приходят без "HTTP NNN"
        if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|fetch failed/i.test(msg)) return true

        return false
    }

    async exec<T>(key: string, fn: () => Promise<T>): Promise<T> {
        this.callsSinceSweep++
        if (this.callsSinceSweep >= this.sweepEveryCalls) {
            this.callsSinceSweep = 0
            this.sweepStates()
        }

        const s = this.getState(key)

        if (s.state === "open") {

            if (Date.now() - s.lastFailure > this.cooldown) {
                s.state = "closed"
                s.failures = 0
            } else {
                throw new Error("Circuit breaker open")
            }
        }

        try {

            const res = await fn()

            s.failures = 0

            return res

        } catch (err) {

            if (this.isRetriableFailure(err)) {
                s.failures++
                s.lastFailure = Date.now()

                if (s.failures >= this.threshold) {
                    s.state = "open"
                }
            }

            throw err
        }
    }
}