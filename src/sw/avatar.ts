import type { BaseTelegramClient } from '@mtcute/web'
import { downloadAsBuffer, getMe } from '@mtcute/web/methods.js'
import { createInternalClient } from '../lib/telegram.ts'
import { timeout } from '../lib/utils.ts'
import { $accounts } from '../store/accounts.ts'
import { getCacheStorage } from './cache.ts'

const clients = new Map<string, BaseTelegramClient>()

export async function handleAvatarRequest(accountId: string) {
  const cacheKey = new URL(`/sw/avatar/${accountId}`, location.origin)

  const cache = await getCacheStorage()
  try {
    const cachedRes = await timeout(cache.match(cacheKey), 10000)
    if (cachedRes && cachedRes.ok) {
      return cachedRes
    }
  } catch {}

  let client = clients.get(accountId)
  if (!client) {
    client = createInternalClient(accountId)
    await client.prepare()
    clients.set(accountId, client)
  }

  const self = await getMe(client)

  if (!self.photo) {
    return new Response('No photo', { status: 404 })
  }

  const buf = await downloadAsBuffer(client, self.photo.big)
  await client.close()

  const res = new Response(buf, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
  await cache.put(cacheKey, res.clone())

  return res
}
