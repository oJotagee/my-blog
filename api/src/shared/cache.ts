import { randomUUID } from 'node:crypto'
import type { Redis } from 'ioredis'

export type CacheStore = Pick<Redis, 'get' | 'set' | 'incr' | 'pttl' | 'exists' | 'eval'>

export type CacheConfig = {
  ttlMs: number
  refreshAheadMs: number
  lockTtlMs: number
  waitTimeoutMs: number
  pollMs: number
}

const PREFIX = 'blog:content'

const GENERATION_KEY = `${PREFIX}:generation`

// Só quem pegou o lock pode soltar.
const RELEASE_LOCK = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`

type Entry<T> = { value: T; remainingMs: number }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// JSON transforma Date em texto, e os schemas de resposta exigem Date de volta.
function serialize(value: unknown) {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, current) {
    const original = this[key]

    return original instanceof Date ? { $date: original.toISOString() } : current
  })
}

function deserialize<T>(raw: string): T {
  return JSON.parse(raw, (_key, current) =>
    typeof current?.$date === 'string' ? new Date(current.$date) : current,
  )
}

export function createCache(store: CacheStore | null, config: CacheConfig) {
  const inflight = new Map<string, Promise<unknown>>()

  // Fica ligado quando uma invalidação falha: o que está no Redis pode estar velho.
  let pendingInvalidation = false

  async function bump(redis: CacheStore) {
    await redis.incr(GENERATION_KEY)

    pendingInvalidation = false
  }

  async function read<T>(redis: CacheStore, key: string): Promise<Entry<T> | null> {
    const [raw, remainingMs] = await Promise.all([redis.get(key), redis.pttl(key)])

    return raw === null ? null : { value: deserialize<T>(raw), remainingMs }
  }

  const isFresh = <T>(entry: Entry<T> | null): entry is Entry<T> =>
    entry !== null && entry.remainingMs > config.refreshAheadMs

  async function waitForRebuild<T>(redis: CacheStore, key: string, lockKey: string) {
    const deadline = Date.now() + config.waitTimeoutMs

    while (Date.now() < deadline) {
      await sleep(config.pollMs)

      if (await redis.exists(lockKey)) continue

      const entry = await read<T>(redis, key)

      return isFresh(entry) ? entry : null
    }

    return null
  }

  async function rebuild<T>(
    redis: CacheStore,
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
    stale: Entry<T> | null,
  ): Promise<T> {
    const lockKey = `${key}:lock`

    const token = randomUUID()

    const fallback = () => (stale ? Promise.resolve(stale.value) : loader())

    let acquired: boolean

    try {
      acquired = (await redis.set(lockKey, token, 'PX', config.lockTtlMs, 'NX')) === 'OK'
    } catch {
      return fallback()
    }

    if (!acquired) {
      const rebuilt = await waitForRebuild<T>(redis, key, lockKey).catch(() => null)

      return rebuilt ? rebuilt.value : fallback()
    }

    try {
      // Outro pedido pode ter reconstruído entre a nossa leitura e o lock.
      const current = await read<T>(redis, key).catch(() => null)

      if (isFresh(current)) return current.value

      const value = await loader()

      if (value !== undefined) {
        await redis.set(key, serialize(value), 'PX', ttlMs).catch(() => undefined)
      }

      return value
    } finally {
      await redis.eval(RELEASE_LOCK, 1, lockKey, token).catch(() => undefined)
    }
  }

  return {
    async getOrLoad<T>(key: string, loader: () => Promise<T>, ttlMs = config.ttlMs): Promise<T> {
      if (!store) return loader()

      let fullKey: string

      let cached: Entry<T> | null

      try {
        if (pendingInvalidation) await bump(store)

        fullKey = `${PREFIX}:v${(await store.get(GENERATION_KEY)) ?? '0'}:${key}`

        cached = await read<T>(store, fullKey)
      } catch {
        return loader()
      }

      if (isFresh(cached)) return cached.value

      // No mesmo processo, quem chega durante a reconstrução espera a mesma promessa.
      const running = inflight.get(fullKey) as Promise<T> | undefined

      if (running) return running

      const promise = rebuild(store, fullKey, ttlMs, loader, cached).finally(() => {
        inflight.delete(fullKey)
      })

      inflight.set(fullKey, promise)

      return promise
    },

    /** Troca a geração: todas as chaves antigas deixam de ser lidas e vencem sozinhas. */
    async invalidate() {
      if (!store) return

      try {
        await bump(store)
      } catch (error) {
        pendingInvalidation = true

        console.error('Cache invalidation failed', (error as Error).message)
      }
    },
  }
}
