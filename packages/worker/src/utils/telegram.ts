import type { InputStringSessionData } from '@mtcute/web/utils.js'
import type { TelegramAccount } from '../store/accounts.ts'
import { asNonNull } from '@fuman/utils'
import { BaseTelegramClient, IdbStorage, TransportError } from '@mtcute/web'
import { getMe } from '@mtcute/web/methods.js'
import { nanoid } from 'nanoid'

export function createInternalClient(accountId: string, testMode?: boolean) {
  return new BaseTelegramClient({
    apiId: Number(import.meta.env.VITE_API_ID),
    apiHash: import.meta.env.VITE_API_HASH,
    storage: new IdbStorage(`mtcute:${accountId}`),
    testMode,
    logLevel: import.meta.env.DEV ? 5 : 2,
  })
}

export async function deleteAccount(accountId: string) {
  const req = indexedDB.deleteDatabase(`mtcute:${accountId}`)
  return new Promise<void>((resolve, reject) => {
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function importAccount(
  session: InputStringSessionData,
  abortSignal: AbortSignal,
): Promise<TelegramAccount> {
  const accountId = nanoid()
  const client = createInternalClient(accountId, session.primaryDcs?.main.testMode)

  let is404 = false

  try {
    await client.importSession(session)
    if (abortSignal.aborted) throw abortSignal.reason

    // verify auth_key is valid (i.e. we don't get -404)
    client.onError.add((err) => {
      if (err instanceof TransportError && err.code === 404) {
        is404 = true
        client.close()
      }
    })
    await client.connect()

    const self = await getMe(client)
    if (abortSignal.aborted) throw abortSignal.reason

    await client.close()

    return {
      id: accountId,
      name: self.displayName,
      telegramId: self.id,
      bot: self.isBot,
      testMode: asNonNull(session.primaryDcs).main.testMode ?? false,
      dcId: asNonNull(session.primaryDcs).main.id,
    }
  } catch (e) {
    await client.close()
    await deleteAccount(accountId)
    if (is404) {
      throw new Error('Invalid session (auth key not found)')
    }
    throw e
  }
}
