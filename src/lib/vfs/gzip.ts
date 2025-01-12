import type { IClosable, IReadable } from '@fuman/io'
import { Bytes, ReaderWithFinal } from '@fuman/io'
import { Deferred, Deque } from '@fuman/utils'
import { AsyncGunzip } from 'fflate/browser'

const INTERNAL_CHUNK_SIZE = 1024 * 1024

export class GunzipStream implements IReadable, IClosable {
  #gunzip = new AsyncGunzip(this.#onChunk.bind(this))
  #buffer = Bytes.alloc()
  #waiters = new Deque<Deferred<void>>()
  #error: unknown | null = null
  #totalRead = 0
  #reader: ReaderWithFinal
  #internalBuffer = new Uint8Array(INTERNAL_CHUNK_SIZE)

  constructor(stream: IReadable) {
    this.#reader = new ReaderWithFinal(stream)
  }

  get totalRead(): number {
    return this.#totalRead
  }

  #onChunk(err: unknown, data: Uint8Array) {
    if (err) {
      while (this.#waiters.length > 0) {
        this.#waiters.popFront()!.reject(err)
      }
      this.#error = err

      return
    }

    if (this.#waiters.length > 0) {
      this.#waiters.popFront()!.resolve()
    }

    this.#buffer.writeSync(data.length).set(data)
  }

  async read(into: Uint8Array): Promise<number> {
    if (this.#buffer.available > 0) {
      return this.#buffer.read(into)
    }

    if (this.#error) throw this.#error

    const { nread, final } = await this.#reader.readWithFinal(this.#internalBuffer)
    if (nread === 0) {
      this.#gunzip.terminate()
      return 0
    }

    this.#totalRead += nread

    const def = new Deferred<void>()
    this.#waiters.pushBack(def)

    this.#gunzip.push(this.#internalBuffer.slice(0, nread), final)
    await def.promise

    if (this.#buffer.available === 0) {
      // try reading again
      return this.read(into)
    }

    return this.#buffer.read(into)
  }

  close(): void {
    this.#gunzip.terminate()
  }
}
