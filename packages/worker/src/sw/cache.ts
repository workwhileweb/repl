import { timeout } from '../utils/timeout.ts'

let _cacheStorage: Cache | undefined

const CACHE_STORE_NAME = 'cached'

export async function getCacheStorage() {
  if (!_cacheStorage) {
    const storage = await caches.open(CACHE_STORE_NAME)
    _cacheStorage = storage
  }
  return _cacheStorage
}

export async function requestCache(event: FetchEvent) {
  try {
    const cache = await timeout(getCacheStorage(), 10000)
    const cachedRes = await timeout(cache.match(event.request), 10000)

    if (cachedRes && cachedRes.ok) {
      return cachedRes
    }

    const headers: HeadersInit = { Vary: '*' }
    const response = await fetch(event.request, { headers })
    if (response.ok) {
      cache.put(event.request, response.clone())
    }

    return response
  } catch {
    return fetch(event.request)
  }
}
