import type { DBSchema, IDBPDatabase } from 'idb'
import { openDB } from 'idb'

export interface VfsFile {
  path: string
  contents: Uint8Array
}

interface Schema extends DBSchema {
  libs: {
    key: string
    value: {
      // we do not support multiple versions of the same lib (for now?)
      name: string
      version: string
      files: VfsFile[]
    }
  }
}

export class VfsStorage {
  constructor(private db: IDBPDatabase<Schema>) {}

  static async create() {
    const db = await openDB<Schema>('mtcute-repl-vfs', 1, {
      upgrade(db) {
        db.createObjectStore('libs', { keyPath: 'name' })
      },
    })

    return new VfsStorage(db)
  }

  async getAvailableLibs() {
    return this.db.getAllKeys('libs')
  }

  async getExistingLibVersion(lib: string) {
    const obj = await this.db.get('libs', lib)
    return obj?.version
  }

  async readLibrary(lib: string) {
    return this.db.get('libs', lib)
  }

  async writeLibrary(lib: string, version: string, files: VfsFile[]) {
    await this.db.put('libs', { name: lib, version, files })
  }

  async deleteLib(lib: string) {
    await this.db.delete('libs', lib)
  }
}
