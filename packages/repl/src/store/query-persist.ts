import type {
  PersistedClient,
  Persister,
} from '@tanstack/solid-query-persist-client'
import { del, get, set } from 'idb-keyval'

const PERSIST_KEY = 'repl-query-persist'

export function createIdbPersister() {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(PERSIST_KEY, client)
    },
    restoreClient: async () => {
      return await get<PersistedClient>(PERSIST_KEY)
    },
    removeClient: async () => {
      await del(PERSIST_KEY)
    },
  } as Persister
}
