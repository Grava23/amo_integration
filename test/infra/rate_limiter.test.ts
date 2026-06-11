import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { RateLimiter } from "../../src/infra/rate_limiter.js"

describe("RateLimiter", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it("прокидывает результат fn", async () => {
        const rl = new RateLimiter(5)
        await expect(rl.schedule(async () => "value")).resolves.toBe("value")
    })

    it("выполняет вызовы в пределах лимита сразу", async () => {
        const rl = new RateLimiter(3)
        const results = await Promise.all([
            rl.schedule(async () => 1),
            rl.schedule(async () => 2),
            rl.schedule(async () => 3),
        ])
        expect(results).toEqual([1, 2, 3])
    })

    it("откладывает вызовы сверх лимита до освобождения окна", async () => {
        const rl = new RateLimiter(1)
        const order: number[] = []

        const p1 = rl.schedule(async () => { order.push(1) })
        await p1
        expect(order).toEqual([1])

        const p2 = rl.schedule(async () => { order.push(2) })
        // второй вызов ждёт ~1с
        expect(order).toEqual([1])

        await vi.advanceTimersByTimeAsync(1000)
        await p2
        expect(order).toEqual([1, 2])
    })
})
