import type { UserConfig } from 'vite'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig((env): UserConfig => {
  process.env = {
    ...process.env,
    ...loadEnv(env.mode, join(__dirname, '../..')),
  }

  return {
    server: {
      port: 3001,
    },
    preview: {
      port: 3001,
    },
    optimizeDeps: {
      exclude: ['@mtcute/wasm'],
    },
    build: {
      emptyOutDir: true,
      assetsDir: '',
      rollupOptions: {
        external: ['node:fs/promises', 'node:crypto'],
      },
    },
  }
})
