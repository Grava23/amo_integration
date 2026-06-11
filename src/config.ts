import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

const configSchema = z.object({
    PORT: z.coerce.number().default(8080),
    HOST: z.string().default("0.0.0.0"),
    AMO_CLIENT_RETRY_ATTEMPTS: z.coerce.number().default(3),
    AMO_CLIENT_BASE_DELAY_MS: z.coerce.number().default(200),
    AMO_CLIENT_RPS: z.coerce.number().default(7),
    AMO_OAUTH_URL: z.string().default("https://www.amocrm.ru/oauth"),
    AMO_CLIENT_ID: z.string().default(""),
    AMO_CLIENT_SECRET: z.string().default(""),
    AMO_REDIRECT_URI: z.string().default(""),
    /** Публичный URL API для подсказок OAuth (Redirect URI в amo). По умолчанию localhost:PORT */
    API_PUBLIC_URL: z.string().optional(),
    AMO_CHANNEL_ID: z.string().default(""),
    AMO_CHANNEL_SECRET: z.string().default(""),
    /** Origins фронтенда для CORS (через запятую). По умолчанию Vite dev-сервер. */
    FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
    /** Если задан — запросы (кроме /health, /api/v1/auth/oauth/complete, /webhook/*) требуют Bearer или x-api-key */
    SERVER_API_KEY: z.string().optional(),
    N8N_CLIENT_RETRY_ATTEMPTS: z.coerce.number().default(3),
    N8N_CLIENT_BASE_DELAY_MS: z.coerce.number().default(200),
    N8N_API_URL: z.string().default("https://host"),
    N8N_CLIENT_RPS: z.coerce.number().default(50),
})

const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
    console.error("❌ Invalid environment variables")
    console.error(parsed.error.format())
    process.exit(1)
}

export const config = parsed.data