import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["test/**/*.test.ts"],
        // Интеграционные тесты на реальной БД (testcontainers) запускаются отдельной командой
        exclude: ["test/**/*.int.test.ts", "node_modules/**"],
        setupFiles: ["test/setup.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "src/generated/**",
                "src/index.ts",
                "src/types/**",
                "src/**/*.d.ts",
            ],
            reporter: ["text", "text-summary", "html"],
        },
    },
})
