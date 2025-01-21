import type { SwMessage } from './main.ts'
import { asNonNull } from '@fuman/utils'
import { swInvokeMethodInner } from './client-inner.ts'
import { waitForServiceWorkerInit } from './register.ts'

export async function getServiceWorker() {
  await waitForServiceWorkerInit()
  return asNonNull(navigator.serviceWorker.controller)
}

export async function swInvokeMethod(request: SwMessage) {
  return swInvokeMethodInner(request, await getServiceWorker())
}
