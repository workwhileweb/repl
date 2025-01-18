import type { SwMessage } from './main.ts'
import { asNonNull, Deferred } from '@fuman/utils'
import { waitForServiceWorkerInit } from './register.ts'

export async function getServiceWorker() {
  await waitForServiceWorkerInit()
  return asNonNull(navigator.serviceWorker.controller)
}

let registered = false
let nextId = 0
const pending = new Map<number, Deferred<any>>()

export async function swInvokeMethod(request: SwMessage) {
  const sw = await getServiceWorker()
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
