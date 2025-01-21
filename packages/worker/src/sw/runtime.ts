import { utf8 } from '@fuman/utils'
import { VfsStorage } from '../vfs/storage.ts'
import { generateImportMap, generateRunnerHtml } from './iframe/html.ts'
import { getScriptFile } from './scripts.ts'

const libraryCache = new Map<string, Map<string, Uint8Array>>()
let importMapCache: Record<string, string> | undefined
let vfs: VfsStorage | undefined

async function getVfs() {
  if (!vfs) {
    vfs = await VfsStorage.create()
  }
  return vfs
}

async function loadLibrary(name: string) {
  const vfs = await getVfs()
  if (libraryCache.has(name)) {
    return libraryCache.get(name)!
  }

  const lib = await vfs.readLibrary(name)
  if (!lib) return null

  const map = new Map<string, Uint8Array>()
  libraryCache.set(name, map)
  for (const file of lib.files) {
    map.set(file.path, file.contents)
  }
  return map
}

export function clearCache() {
  libraryCache.clear()
  importMapCache = undefined
  vfs = undefined
}

// /sw/runtime/[library-name]/[...file...]
export async function handleRuntimeRequest(url: URL) {
  const path = url.pathname.slice('/sw/runtime/'.length)

  if (path === '_iframe.html') {
    if (!importMapCache) {
      const vfs = await getVfs()
      const libNames = (await vfs.getAvailableLibs()).filter(lib => !lib.startsWith('@types/'))
      const allLibs = await Promise.all(libNames.map(loadLibrary))

      const packageJsons: any[] = []
      for (const lib of allLibs) {
        if (!lib) continue
        const pkgJson = lib.get('package.json')
        if (!pkgJson) continue
        packageJsons.push(JSON.parse(utf8.decoder.decode(pkgJson)))
      }

      importMapCache = await generateImportMap(packageJsons)
    }

    const html = generateRunnerHtml(importMapCache)
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  if (path.startsWith('script/')) {
    const scriptIdWithPath = path.slice('script/'.length)
    const idx = scriptIdWithPath.indexOf('/')
    const scriptId = scriptIdWithPath.slice(0, idx)
    const fileName = scriptIdWithPath.slice(idx + 1)

    const file = await getScriptFile(scriptId, fileName)
    if (!file) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(file, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }

  let slashIdx = path.indexOf('/')
  if (slashIdx === -1) {
    return new Response('Not found', { status: 404 })
  }

  if (path[0] === '@') {
    // scoped package
    slashIdx = path.indexOf('/', slashIdx + 1)
    if (slashIdx === -1) {
      return new Response('Not found', { status: 404 })
    }
  }

  const packageName = path.slice(0, slashIdx)
  const filePath = path.slice(slashIdx + 1)

  const files = await loadLibrary(packageName)
  if (!files) {
    return new Response('Library not found', { status: 404 })
  }

  const file = files.get(filePath)
  if (!file) return new Response('Not found', { status: 404 })

  const ext = filePath.split('.').pop()!
  const mime = {
    js: 'application/javascript',
    mjs: 'application/javascript',
    wasm: 'application/wasm',
    json: 'application/json',
  }[ext] ?? 'application/octet-stream'

  return new Response(file, {
    headers: {
      'Content-Type': mime,
    },
  })
}
