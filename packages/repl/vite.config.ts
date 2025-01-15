import type { UserConfig } from 'vite'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import solid from 'vite-plugin-solid'
// eslint-disable-next-line import/no-relative-packages
import externalizeDeps from '../../scripts/vite-plugin-externalize-dependencies.ts'

export default defineConfig((env): UserConfig => {
  process.env = {
    ...process.env,
    ...loadEnv(env.mode, join(__dirname, '../..')),
  }

  return {
    optimizeDeps: {
      exclude: ['@mtcute/wasm'],
    },
    server: {
      port: 3000,
    },
    plugins: [
      solid(),
      externalizeDeps({
        externals: [],
      }),
    ],
  }
})
