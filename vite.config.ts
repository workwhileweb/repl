import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import externalizeDeps from './scripts/vite-plugin-externalize-dependencies.ts'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@mtcute/wasm'],
  },
  plugins: [
    solid(),
    externalizeDeps({
      externals: [],
    }),
  ],
})
