import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { build } from 'esbuild'

config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
})

const defines: Record<string, string> = {}
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith('VITE_')) {
    defines[`import.meta.env.${key}`] = JSON.stringify(value)
  }
}

await build({
  entryPoints: ['src/sw/iframe/script.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'src/sw/iframe/script-bundled.js',
  define: defines,
  external: ['@mtcute/web'],
  minify: true,
})
