import type { UserConfig } from 'vite'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
// eslint-disable-next-line import/no-relative-packages
import externalizeDeps from '../../scripts/vite-plugin-externalize-dependencies.ts'

export default defineConfig((env): UserConfig => {
  process.env = {
    ...process.env,
    ...loadEnv(env.mode, join(__dirname, '../..')),
  }

  return {
    server: {
      port: 3001,
    },
    optimizeDeps: {
      exclude: ['@mtcute/wasm'],
    },
    build: {
      rollupOptions: {
        external: ['node:fs/promises', 'node:crypto'],
      },
    },
    plugins: [
      externalizeDeps({
        externals: [],
      }),
    ],
  }
})
