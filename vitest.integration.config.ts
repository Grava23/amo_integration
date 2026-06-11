import { defineConfig } from "vitest/config"

// Интеграционные тесты: поднимают реальный Postgres в Docker (testcontainers).
// Запуск: npm run test:integration (требуется доступный Docker-демон).
export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["test/**/*.int.test.ts"],
        setupFiles: ["test/setup.ts"],
        globalSetup: ["test/integration/global-setup.ts"],
        // Контейнер один на прогон — гоняем интеграционные тесты последовательно.
        fileParallelism: false,
        testTimeout: 60_000,
        hookTimeout: 120_000,
    },
})
