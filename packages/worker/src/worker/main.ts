import { publishLinkedAtoms, writeLinkedAtom } from '../store/link.ts'
import { ReplWorkerSw } from './sw.ts'
import { ReplWorkerTelegram } from './telegram.ts'
import { ReplWorkerVfs } from './vfs.ts'

export class ReplWorker {
  readonly telegram = new ReplWorkerTelegram()
  readonly vfs = new ReplWorkerVfs()
  readonly sw = new ReplWorkerSw()

  readonly atom = {
    write({ id, value }: { id: string, value: any }) {
      writeLinkedAtom(id, value)
    },
  }
}

const pendingAborts = new Map<number, AbortController>()

export function registerWorker(worker: ReplWorker) {
  globalThis.onmessage = async (e) => {
    if (e.source !== window.parent) return
    if (e.origin !== import.meta.env.VITE_HOST_ORIGIN) {
      console.error('Ignoring message from invalid origin', e.origin)
      return
    }

    if (e.data.abort) {
      const abortController = pendingAborts.get(e.data.id)
      if (abortController) {
        abortController.abort()
      }
      return
    }

    const {
      id,
      domain,
      method,
      params,
      withAbort,
    } = e.data

    if (!(domain in worker) || !(method in (worker as any)[domain])) {
      window.parent.postMessage({ id, error: `Method ${domain}.${method} not found` }, '*')
      return
    }

    if (withAbort) {
      const abortController = new AbortController()
      pendingAborts.set(id, abortController)
      params.abortSignal = abortController.signal
    }

    try {
      const result = await (worker as any)[domain][method](params)
      window.parent.postMessage({ id, result }, '*')
    } catch (error) {
      window.parent.postMessage({ id, error }, '*')
    }

    if (withAbort) {
      pendingAborts.delete(id)
    }
  }

  window.parent.postMessage({ event: 'LOADED' }, '*')
  publishLinkedAtoms()
}
