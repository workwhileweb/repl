import { unknownToError } from '@fuman/utils'
import { IS_SAFARI } from '../utils/env.ts'
import { clearAvatarCache, handleAvatarRequest } from './avatar.ts'
import { requestCache } from './cache.ts'
import { type DownloadFileParams, handleDownload, handlePort } from './download/handler.ts'
import { clearCache, handleRuntimeRequest } from './runtime.ts'
import { forgetAllScripts, forgetScript, uploadScript } from './scripts.ts'

declare const self: ServiceWorkerGlobalScope

async function handleSwRequest(_req: Request, url: URL): Promise<Response> {
  if (url.pathname.startsWith('/sw/avatar/')) {
    const accountId = url.pathname.split('/')[3]
    return handleAvatarRequest(accountId)
  }

  if (url.pathname.startsWith('/sw/runtime/')) {
    return handleRuntimeRequest(url)
  }

  if (url.pathname.startsWith('/sw/download/')) {
    const id = url.pathname.split('/')[3]
    return handleDownload(id)
  }

  return new Response('Not Found', { status: 404 })
}

function onFetch(event: FetchEvent) {
  const req = event.request
  const url = new URL(req.url)

  if (url.pathname.startsWith('/sw/')) {
    event.respondWith(
      handleSwRequest(req, url)
        .catch((err) => {
          console.error(err)
          return new Response(err.message || err.toString(), { status: 500 })
        }),
    )
  }

  if (
    import.meta.env.PROD
      && !IS_SAFARI
      && event.request.url.indexOf(`${location.origin}/`) === 0
      && event.request.url.match(/\.(js|css|jpe?g|json|wasm|png|mp3|svg|tgs|ico|woff2?|ttf|webmanifest?)(?:\?.*)?$/)
  ) {
    return event.respondWith(requestCache(event))
  }
}

function register() {
  self.onfetch = onFetch
}

register()
self.onoffline = self.ononline = () => {
  register()
}

export type SwMessage =
  | { event: 'UPLOAD_SCRIPT', name: string, files: Record<string, string> }
  | { event: 'FORGET_SCRIPT', name: string }
  | { event: 'CLEAR_AVATAR_CACHE', accountId: string }
  | { event: 'CLEAR_CACHE' }
  | { event: 'DOWNLOAD_FILE', id: string, params: DownloadFileParams, port: MessagePort }

async function handleMessage(msg: SwMessage) {
  switch (msg.event) {
    case 'UPLOAD_SCRIPT': {
      await uploadScript(msg.name, msg.files)
      break
    }
    case 'FORGET_SCRIPT': {
      await forgetScript(msg.name)
      break
    }
    case 'CLEAR_CACHE': {
      clearCache()
      await forgetAllScripts()
      break
    }
    case 'CLEAR_AVATAR_CACHE': {
      clearAvatarCache(msg.accountId)
      break
    }
  }
}

self.onmessage = async (event) => {
  const msg = event.data as SwMessage & { id: number }
  if (msg.event === 'DOWNLOAD_FILE') {
    return handlePort(msg.port, msg.id, msg.params)
  }

  try {
    const result = await handleMessage(msg)
    event.source!.postMessage({ id: msg.id, result })
  } catch (e) {
    event.source!.postMessage({ id: msg.id, error: unknownToError(e).message })
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
