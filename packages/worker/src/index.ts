import { registerServiceWorker } from './sw/register.ts'
import { registerWorker, ReplWorker } from './worker/main.ts'
import './store/accounts.ts'

registerServiceWorker()

if (!window.parent || window.parent === window) {
  document.querySelector('#root')!.innerHTML = 'This is an internal page used by the mtcute-repl app, and must be loaded in an iframe.'
  throw new Error('Not in iframe')
}

if (new URL(document.referrer).origin !== import.meta.env.VITE_HOST_ORIGIN) {
  throw new Error(`Invalid origin: this page must be loaded in an iframe from ${import.meta.env.VITE_HOST_ORIGIN}`)
}

const worker = new ReplWorker()

registerWorker(worker)
