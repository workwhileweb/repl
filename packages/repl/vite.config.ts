import type { UserConfig } from 'vite'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig((env): UserConfig => {
  process.env = {
    ...process.env,
    ...loadEnv(env.mode, join(__dirname, '../..')),
  }

  return {
    define: {
      'import.meta.env.BUILD_VERSION': JSON.stringify(new Date()),
    },
    optimizeDeps: {
      exclude: ['@mtcute/wasm'],
    },
    preview: {
      port: 3000,
    },
    build: {
      rollupOptions: {
        external: ['node:fs/promises', 'node:crypto'],
      },
    },
    server: {
      port: 3000,
    },
    plugins: [
      solid(),
    ],
  }
})
