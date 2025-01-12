// eslint-disable-next-line antfu/no-import-dist
import chobitsuUrl from '../../vendor/chobitsu/dist/chobitsu.js?url'
import runnerScriptUrl from '../components/runner/iframe.ts?url'

export async function generateImportMap(packageJsons: any[]) {
  const importMap: Record<string, string> = {}
  for (const pkg of packageJsons) {
    const name = pkg.name
    const swPrefix = `${location.origin}/sw/runtime/${name}/`

    if (pkg.exports) {
      if ('import' in pkg.exports || 'require' in pkg.exports) {
        pkg.exports = { '.': pkg.exports }
      }

      for (const key of Object.keys(pkg.exports)) {
        let target = pkg.exports[key]
        if (typeof target === 'object') {
          // { "import": "./index.js", "require": "./index.cjs" }
          // or
          // { "import": { "types": "./index.d.ts", "default": "./index.js" }, "require": "./index.cjs" }
          if (!('import' in target)) {
            throw new Error(`Invalid export target (no esm): ${key} in ${name}`)
          }
          target = target.import
          if (typeof target === 'object') {
            if (!('default' in target)) {
              throw new Error(`Invalid export target (no defalt): ${key} in ${name}`)
            }
            target = target.default
          }
        }
        if (typeof target !== 'string') {
          throw new TypeError(`Invalid export target: ${key} in ${name}`)
        }

        target = target.replace(/^\.\//, '')

        if (target[0] === '.') {
          throw new Error(`Invalid export target: ${key} in ${name}`)
        }

        if (key === '.') {
          importMap[name] = `${swPrefix}${target}`
        } else if (key[0] === '.' && key[1] === '/') {
          importMap[`${name}/${key.slice(2)}`] = `${swPrefix}${target}`
        } else {
          throw new Error(`Invalid export target: ${key} in ${name}`)
        }
      }
    } else if (pkg.module) {
      importMap[name] = `${swPrefix}${pkg.module.replace(/^\.\//, '')}`
    } else if (pkg.main) {
      let target = pkg.main.replace(/^\.\//, '')
      if (!target.endsWith('.js')) {
        target += '.js'
      }
      importMap[name] = `${swPrefix}${target}`
    } else {
      importMap[name] = `${swPrefix}index.js`
    }
  }

  return importMap
}

export function generateRunnerHtml(importMap: Record<string, string>) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <script async src="https://ga.jspm.io/npm:es-module-shims@1.7.0/dist/es-module-shims.js"></script>
        <script type="importmap">${JSON.stringify({ imports: importMap })}</script>
        <script>
          Object.keys(console).forEach(method => Object.defineProperty(console, method, { value: () => {} }));
        </script>
        <script src="${chobitsuUrl}"></script>
        <script type="module" src="${runnerScriptUrl}"></script>
      </head>
    </html>
  `
}
