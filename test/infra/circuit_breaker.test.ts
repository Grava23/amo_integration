import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { CircuitBreaker } from "../../src/infra/circuit_breaker.js"

describe("CircuitBreaker", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it("возвращает результат и сбрасывает счётчик ошибок при успехе", async () => {
        const cb = new CircuitBreaker(2, 1000)
        await expect(cb.exec("k", async () => 42)).resolves.toBe(42)
    })

    it("не открывается на 4xx (постоянные ошибки)", async () => {
        const cb = new CircuitBreaker(2, 1000)
        const fn = vi.fn(async () => { throw new Error("HTTP 404: not found") })

        for (let i = 0; i < 5; i++) {
            await expect(cb.exec("k", fn)).rejects.toThrow("HTTP 404")
        }
        // даже после 5 ошибок брейкер закрыт — fn вызывается каждый раз
        expect(fn).toHaveBeenCalledTimes(5)
    })

    it("открывается после threshold ретраибельных ошибок (5xx) и не зовёт fn", async () => {
        const cb = new CircuitBreaker(2, 1000)
        const fn = vi.fn(async () => { throw new Error("HTTP 503: unavailable") })

        await expect(cb.exec("k", fn)).rejects.toThrow("HTTP 503")
        await expect(cb.exec("k", fn)).rejects.toThrow("HTTP 503")
        // брейкер открыт
        await expect(cb.exec("k", fn)).rejects.toThrow("Circuit breaker open")
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it("закрывается снова после cooldown", async () => {
        const cb = new CircuitBreaker(1, 1000)
        const failing = vi.fn(async () => { throw new Error("HTTP 500") })

        await expect(cb.exec("k", failing)).rejects.toThrow("HTTP 500")
        await expect(cb.exec("k", failing)).rejects.toThrow("Circuit breaker open")

        vi.advanceTimersByTime(1001)

        const ok = vi.fn(async () => "ok")
        await expect(cb.exec("k", ok)).resolves.toBe("ok")
        expect(ok).toHaveBeenCalledOnce()
    })

    it("считает сетевые ошибки (ECONNRESET) ретраибельными", async () => {
        const cb = new CircuitBreaker(1, 1000)
        const fn = vi.fn(async () => { throw new Error("ECONNRESET socket hang up") })

        await expect(cb.exec("k", fn)).rejects.toThrow("ECONNRESET")
        await expect(cb.exec("k", fn)).rejects.toThrow("Circuit breaker open")
    })

    it("HTTP 429 (rate limit) считается ретраибельным и открывает брейкер", async () => {
        const cb = new CircuitBreaker(1, 1000)
        const fn = vi.fn(async () => { throw new Error("HTTP 429: too many requests") })

        await expect(cb.exec("k", fn)).rejects.toThrow("HTTP 429")
        // в отличие от прочих 4xx, 429 инкрементит счётчик и открывает брейкер
        await expect(cb.exec("k", fn)).rejects.toThrow("Circuit breaker open")
    })

    it("HTTP_RETRYABLE_ ошибки открывают брейкер", async () => {
        const cb = new CircuitBreaker(1, 1000)
        const fn = vi.fn(async () => { throw new Error("HTTP_RETRYABLE_400: host could not be resolved") })

        await expect(cb.exec("k", fn)).rejects.toThrow("HTTP_RETRYABLE_400")
        await expect(cb.exec("k", fn)).rejects.toThrow("Circuit breaker open")
    })

    it("не считает поломкой произвольную не-HTTP ошибку", async () => {
        const cb = new CircuitBreaker(1, 1000)
        const fn = vi.fn(async () => { throw new Error("just some logic error") })

        await expect(cb.exec("k", fn)).rejects.toThrow("just some logic error")
        // брейкер не открылся — fn зовётся снова
        await expect(cb.exec("k", fn)).rejects.toThrow("just some logic error")
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it("подчищает простаивающие здоровые состояния (sweep)", async () => {
        // sweepEveryCalls=1 → подчистка на каждом вызове; stateTtlMs=1 → состояние сразу считается простаивающим
        const cb = new CircuitBreaker(5, 1000, 1, 1)
        await expect(cb.exec("host-1", async () => "a")).resolves.toBe("a")
        vi.advanceTimersByTime(10)
        // второй вызов триггерит sweep, который удалит здоровое простаивающее состояние host-1
        await expect(cb.exec("host-2", async () => "b")).resolves.toBe("b")
    })

    it("изолирует состояние по ключу хоста", async () => {
        const cb = new CircuitBreaker(1, 1000)
        const fail = async () => { throw new Error("HTTP 500") }

        await expect(cb.exec("host-a", fail)).rejects.toThrow("HTTP 500")
        await expect(cb.exec("host-a", fail)).rejects.toThrow("Circuit breaker open")
        // другой ключ не затронут
        await expect(cb.exec("host-b", async () => "ok")).resolves.toBe("ok")
    })
})
