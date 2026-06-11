import { vi } from "vitest"

// Детерминированное окружение для config.ts (парсится на этапе импорта модуля).
// Ставим ДО любого импорта src-кода — setupFiles выполняются раньше тест-файла.
process.env.PORT ??= "8080"
process.env.HOST ??= "0.0.0.0"
process.env.AMO_OAUTH_URL ??= "https://www.amocrm.ru/oauth"
process.env.AMO_CLIENT_ID ??= "test-client-id"
process.env.AMO_CLIENT_SECRET ??= "test-client-secret"
process.env.AMO_REDIRECT_URI ??= "http://localhost:8080/api/v1/auth/oauth/complete"
process.env.AMO_CHANNEL_ID ??= "test-channel-id"
process.env.AMO_CHANNEL_SECRET ??= "test-channel-secret"
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173"

// Глушим логгер во всех тест-файлах: убирает шум pino-pretty и worker-поток транспорта.
vi.mock("../src/logger.js", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}))
