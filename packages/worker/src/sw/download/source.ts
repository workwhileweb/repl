import type { SwDownloadMessage } from './protocol.ts'
import { SW_DOWNLOAD_OPCODE } from './protocol.ts'

const { WRITE, PULL, ERROR, ABORT, CLOSE } = SW_DOWNLOAD_OPCODE

export class MessagePortSource implements UnderlyingSource<Uint8Array> {
  controller!: ReadableStreamController<Uint8Array>

  constructor(readonly port: MessagePort) {
    this.port = port
    this.port.onmessage = this.onMessage.bind(this)
  }

  start(controller: ReadableStreamController<Uint8Array>) {
    this.controller = controller
  }

  pull() {
    this.port.postMessage({ type: PULL })
  }

  cancel(reason: Error) {
    // Firefox can notify a cancel event, chrome can't
    // https://bugs.chromium.org/p/chromium/issues/detail?id=638494
    this.port.postMessage({ type: ERROR, reason: reason.message })
    this.port.close()
  }

  onMessage(event: MessageEvent) {
    const message = event.data as SwDownloadMessage
    // enqueue() will call pull() if needed when there's no backpressure
    if (message.type === WRITE) {
      (this.controller as any).enqueue(message.chunk!)
    }
    if (message.type === ABORT) {
      this.controller.error(message.reason)
      this.port.close()
    }
    if (message.type === CLOSE) {
      this.controller.close()
      this.port.close()
    }
  }
}
