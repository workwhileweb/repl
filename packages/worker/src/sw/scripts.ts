import type { DBSchema, IDBPDatabase } from 'idb'
import { openDB } from 'idb'

interface Schema extends DBSchema {
  scripts: {
    key: string
    value: {
      id: string
      files: Record<string, string>
    }
  }
}
let db: IDBPDatabase<Schema> | undefined

async function getDb() {
  if (!db) {
    db = await openDB<Schema>('mtcute-repl-scripts', 1, {
      upgrade(db) {
        db.createObjectStore('scripts', { keyPath: 'id' })
      },
    })
  }

  return db
}

export async function uploadScript(id: string, files: Record<string, string>) {
  const db = await getDb()

  await db.put('scripts', { id, files })
}

const cachedScripts = new Map<string, Record<string, string>>()

export async function getScriptFile(id: string, fileName: string): Promise<string | null> {
  if (cachedScripts.has(id)) {
    return cachedScripts.get(id)![fileName]
  }

  const db = await getDb()
  const res = await db.get('scripts', id)
  if (!res) return null

  cachedScripts.set(id, res.files)
  return res.files[fileName]
}

export async function forgetScript(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('scripts', id)
  cachedScripts.delete(id)
}

export async function forgetAllScripts(): Promise<void> {
  const db = await getDb()
  await db.clear('scripts')
  cachedScripts.clear()
}
