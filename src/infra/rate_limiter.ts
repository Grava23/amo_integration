export class RateLimiter {

    private timestamps: number[] = []

    constructor(
        private maxPerSecond = 5
    ) { }

    async schedule<T>(fn: () => Promise<T>): Promise<T> {

        while (true) {
            const now = Date.now()

            // очищаем старые отметки старше 1 секунды
            this.timestamps = this.timestamps.filter(ts => now - ts < 1000)

            if (this.timestamps.length < this.maxPerSecond) {
                this.timestamps.push(now)
                break
            }

            const earliest = this.timestamps[0]
            const wait = Math.max(0, 1000 - (now - (earliest ?? 0)))
            await new Promise(resolve => setTimeout(resolve, wait))
        }

        return await fn()
    }
}