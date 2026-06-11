import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    root: dir,
    envPrefix: "VITE_",
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: "dist",
        rollupOptions: {
            input: {
                main: path.resolve(dir, "index.html"),
                oauthCallback: path.resolve(dir, "oauth/callback/index.html"),
            },
        },
    },
})
