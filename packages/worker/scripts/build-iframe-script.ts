import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { build } from 'esbuild'

config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
})

await build({
  entryPoints: ['src/sw/iframe/script.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'src/sw/iframe/script-bundled.js',
  define: {
    'import.meta.env.VITE_HOST_ORIGIN': `"${process.env.VITE_HOST_ORIGIN}"`,
  },
  external: ['@mtcute/web'],
})
