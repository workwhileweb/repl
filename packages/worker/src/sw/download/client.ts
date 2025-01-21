import type { SwMessage } from '../main.ts'
import type { DownloadFileParams } from './handler.ts'
import type { SwDownloadMessage } from './protocol.ts'
import { asNonNull, Deferred } from '@fuman/utils'
import { nanoid } from 'nanoid'
import { SW_DOWNLOAD_OPCODE } from './protocol.ts'

const { WRITE, CLOSE, PULL, ERROR, ABORT } = SW_DOWNLOAD_OPCODE

class MessagePortSink implements UnderlyingSink<Uint8Array> {
  controller!: WritableStreamDefaultController

  ready = new Deferred<void>()
  readyPending = false

  constructor(
    readonly port: MessagePort,
    readonly onAbort: (reason: unknown) => void,
  ) {
    port.onmessage = this._onMessage.bind(this)
    this._resetReady()
  }

  start(controller: WritableStreamDefaultController) {
    this.controller = controller
    // Apply initial backpressure
    return this.ready.promise
  }

  write(chunk: Uint8Array) {
    const message = { type: WRITE, chunk }

    this.port.postMessage(message, [chunk.buffer])

    // Assume backpressure after every write, until sender pulls
    this._resetReady()

    // Apply backpressure
    return this.ready.promise
  }

  close() {
    this.port.postMessage({ type: CLOSE })
    this.port.close()
  }

  abort(reason: any) {
    this.port.postMessage({ type: ABORT, reason })
    this.port.close()
    this.onAbort(reason)
  }

  _onMessage(event: MessageEvent) {
    const message = event.data as SwDownloadMessage
    if (message.type === PULL) this._resolveReady()
    if (message.type === ERROR) this._onError(message.reason)
  }

  _onError(reason: any) {
    this.controller.error(reason)
    this.port.close()
    this._rejectReady(reason)
  }

  _resetReady() {
    this.ready = new Deferred()
    this.readyPending = true
  }

  _resolveReady() {
    this.ready.resolve()
    this.readyPending = false
  }

  _rejectReady(reason: any) {
    if (!this.readyPending) this._resetReady()
    this.ready.promise.catch(() => {})
    this.ready.reject(reason)
    this.readyPending = false
  }
}

export function createFileDownload(
  options: DownloadFileParams,
  onAbort: (reason: unknown) => void,
): WritableStream<Uint8Array> {
  const sw = asNonNull(navigator.serviceWorker.controller)
  const id = nanoid()
  const channel = new MessageChannel()

  sw.postMessage({
    event: 'DOWNLOAD_FILE',
    id,
    port: channel.port1,
    params: options,
  } satisfies SwMessage, [channel.port1])

  const iframe = document.createElement('iframe')
  iframe.src = `/sw/download/${id}`
  iframe.hidden = true
  document.body.appendChild(iframe)

  iframe.addEventListener('load', () => {
    iframe.remove()
  })

  return new WritableStream(new MessagePortSink(channel.port2, onAbort))
}
