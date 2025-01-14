import type * as mtcuteTypes from '@mtcute/web'
import type { ReplWorker } from './worker/main.ts'
import type { ReplWorkerEvents } from './worker/utils.ts'
import { Deferred, unknownToError } from '@fuman/utils'

export type { TelegramAccount } from './store/accounts.ts'

// eslint-disable-next-line ts/no-namespace
export namespace mtcute {
  export type RawCountry = mtcuteTypes.tl.help.RawCountry
  export type RawCountryCode = mtcuteTypes.tl.help.RawCountryCode
  export type SentCode = mtcuteTypes.SentCode
  export type ConnectionState = mtcuteTypes.ConnectionState
}

const pending = new Map<number, Deferred<any>>()
const listeners = new Map<string, ((e: any) => void)[]>()

let nextId = 0
let iframe: HTMLIFrameElement
let loadedDeferred: Deferred<void> | undefined

export function workerInit(iframe_: HTMLIFrameElement) {
  iframe = iframe_
  loadedDeferred = new Deferred()
  iframe.addEventListener('error', () => {
    loadedDeferred?.reject(new Error('Failed to load worker iframe'))
    loadedDeferred = undefined
  })
  window.addEventListener('message', (e) => {
    if (e.source !== iframe.contentWindow) return
    if (e.data.event === 'LOADED') {
      loadedDeferred?.resolve()
      loadedDeferred = undefined
      return
    }
    if (e.data.event) {
      const fns = listeners.get(e.data.event)
      if (fns) {
        for (const fn of fns) {
          fn(e.data.data)
        }
      }
      return
    }

    const { id, result, error } = e.data
    const def = pending.get(id)
    if (!def) return
    if (error) {
      def.reject(unknownToError(error))
    } else {
      def.resolve(result)
    }
  })
}

type ForceFunction<T> = T extends (...args: any) => any ? T : never

export async function workerInvoke<
  Domain extends keyof ReplWorker,
  Method extends keyof ReplWorker[Domain],
>(
  domain: Domain,
  method: Method,
  ...params: Parameters<ForceFunction<ReplWorker[Domain][Method]>> extends [infer Params] ? [Params] : []
): Promise<ReturnType<ForceFunction<ReplWorker[Domain][Method]>>>

export async function workerInvoke(domain: string, method: string, params?: any) {
  if (loadedDeferred) {
    await loadedDeferred.promise
  }

  const id = nextId++
  const def = new Deferred<any>()
  pending.set(id, def)

  let withAbort = false
  if (params?.abortSignal) {
    const signal = params.abortSignal
    signal.addEventListener('abort', () => {
      iframe.contentWindow!.postMessage({ id, abort: true }, '*')
      def.reject(signal.reason)
      pending.delete(id)
    })
    delete params.abortSignal
    withAbort = true
  }

  iframe.contentWindow!.postMessage({
    id,
    domain,
    method,
    params,
    withAbort,
  }, '*')
  return def.promise
}

export function workerOn<Event extends keyof ReplWorkerEvents>(event: Event, listener: (e: ReplWorkerEvents[Event]) => void) {
  if (!listeners.has(event)) {
    listeners.set(event, [])
  }

  const arr = listeners.get(event)!
  arr.push(listener)

  return () => {
    const idx = arr.indexOf(listener)
    if (idx !== -1) {
      arr.splice(idx, 1)
    }
  }
}
