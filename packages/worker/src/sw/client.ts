import type { SwMessage } from './main.ts'
import { asNonNull, Deferred } from '@fuman/utils'

export function getServiceWorker() {
  return asNonNull(navigator.serviceWorker.controller)
}

let registered = false
let nextId = 0
const pending = new Map<number, Deferred<any>>()

export function swInvokeMethod(request: SwMessage) {
  const sw = getServiceWorker()
  if (!registered) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      const { id, result, error } = (e as MessageEvent).data
      const def = pending.get(id)
      if (!def) return
      if (error) {
        def.reject(new Error(error))
      } else {
        def.resolve(result)
      }
      pending.delete(id)
    })
    registered = true
  }

  const def = new Deferred<any>()
  const id = nextId++
  ;(request as any).id = id
  pending.set(id, def)
  sw.postMessage(request)
  return def.promise
}
