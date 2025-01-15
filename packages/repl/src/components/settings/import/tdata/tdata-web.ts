// separate file containing everything needed to read tdata in the browser,
// so that we can lazily load it
import type { INodeFsLike } from '@mtcute/convert'
import { Bytes } from '@fuman/io'
import { WebCryptoProvider } from '@mtcute/web'
import md5 from 'md5'

export { Tdata } from '@mtcute/convert'

export class WebFsInterface implements INodeFsLike {
  constructor(readonly root: FileSystemDirectoryHandle) {}

  async readFile(path: string): Promise<Uint8Array> {
    path = path.replace(/^\//, '')
    const fileHandle = await this.root.getFileHandle(path, { create: false })
    const file = await fileHandle.getFile()
    return new Uint8Array(await file.arrayBuffer())
  }

  async writeFile(): Promise<void> {
    throw new Error('Not implemented')
  }

  async mkdir(): Promise<void> {
    throw new Error('Not implemented')
  }

  async stat(path: string): Promise<{ size: number, lastModified: number }> {
    path = path.replace(/^\//, '')
    const fileHandle = await this.root.getFileHandle(path, { create: false })
    const file = await fileHandle.getFile()
    return {
      size: file.size,
      lastModified: file.lastModified,
    }
  }
}

export class WebExtCryptoProvider extends WebCryptoProvider {
  async createHash(algorithm: 'md5' | 'sha512') {
    const buf = Bytes.alloc()
    return {
      update(data: Uint8Array) {
        buf.writeSync(data.length).set(data)
      },
      async digest() {
        if (algorithm === 'md5') {
          const hash = md5(buf.result(), { asBytes: true })
          return new Uint8Array(hash)
        } else {
          return new Uint8Array(await crypto.subtle.digest('SHA-512', buf.result()))
        }
      },
    }
  }
}
