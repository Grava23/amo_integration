import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Client } from "pg"
import type { GlobalSetupContext } from "vitest/node"

// Прокидываем строку подключения в тесты через inject("databaseUrl")
declare module "vitest" {
    export interface ProvidedContext {
        databaseUrl: string
    }
}

let container: StartedPostgreSqlContainer

export default async function setup({ provide }: GlobalSetupContext) {
    container = await new PostgreSqlContainer("postgres:16").start()
    const url = container.getConnectionUri()

    // Применяем миграции напрямую (без prisma CLI): простая схема из prisma/migrations/**/migration.sql
    const client = new Client({ connectionString: url })
    await client.connect()
    try {
        const migrationsDir = join(process.cwd(), "prisma", "migrations")
        const dirs = readdirSync(migrationsDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name)
            .sort()

        for (const dir of dirs) {
            const sql = readFileSync(join(migrationsDir, dir, "migration.sql"), "utf8")
            await client.query(sql)
        }
    } finally {
        await client.end()
    }

    provide("databaseUrl", url)

    return async () => {
        await container.stop()
    }
}
