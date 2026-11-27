import { describe, expect, it, spyOn } from 'bun:test'

import { type CacheStore, createCache } from '../../../src/shared/cache'

const config = {
  ttlMs: 60_000,
  refreshAheadMs: 30_000,
  lockTtlMs: 1_000,
  waitTimeoutMs: 500,
  pollMs: 5,
}

function memoryStore() {
  const entries = new Map<string, { value: string; expiresAt: number | null }>()

  const state = { down: false, entries }

  const live = (key: string) => {
    if (state.down) throw new Error('redis down')

    const entry = entries.get(key)

    if (entry?.expiresAt && entry.expiresAt <= Date.now()) entries.delete(key)

    return entries.get(key)
  }

  const store = {
    get: async (key: string) => live(key)?.value ?? null,
    pttl: async (key: string) => {
      const entry = live(key)

      if (!entry) return -2

      return entry.expiresAt ? entry.expiresAt - Date.now() : -1
    },
    exists: async (key: string) => (live(key) ? 1 : 0),
    incr: async (key: string) => {
      const next = Number(live(key)?.value ?? 0) + 1

      entries.set(key, { value: String(next), expiresAt: null })

      return next
    },
    set: async (key: string, value: string, _px: string, ttlMs: number, nx?: string) => {
      if (live(key) && nx) return null

      entries.set(key, { value, expiresAt: Date.now() + ttlMs })

      return 'OK'
    },
    eval: async (_script: string, _keys: number, key: string, token: string) => {
      if (live(key)?.value === token) entries.delete(key)

      return 1
    },
  }

  return { state, store: store as unknown as CacheStore }
}

function slowLoader<T>(value: () => T) {
  const calls = { total: 0 }

  const load = async () => {
    calls.total += 1

    await new Promise((resolve) => setTimeout(resolve, 20))

    return value()
  }

  return { calls, load }
}

/** Deixa a chave a 10 s de vencer, dentro da janela de 30 s. */
function expireSoon(entries: ReturnType<typeof memoryStore>['state']['entries']) {
  for (const [key, entry] of entries) {
    if (key.endsWith(':k')) entry.expiresAt = Date.now() + 10_000
  }
}

describe('cache', () => {
  it('loads once, serves from the cache and keeps dates as dates', async () => {
    const cache = createCache(memoryStore().store, config)

    const value = { at: new Date('2026-01-02T03:04:05.000Z'), text: '2026-01-02T03:04:05.000Z' }

    const { calls, load } = slowLoader(() => value)

    await cache.getOrLoad('k', load)

    expect(await cache.getOrLoad('k', load)).toEqual(value)

    expect(calls.total).toBe(1)
  })

  it('lets only one request load, in one process or in two, while the others wait', async () => {
    const { store, state } = memoryStore()

    const first = createCache(store, config)

    const second = createCache(store, config)

    let version = 1

    const { calls, load } = slowLoader(() => version)

    const burst = () =>
      Promise.all([first, first, second, second].map((cache) => cache.getOrLoad('k', load)))

    expect(await burst()).toEqual([1, 1, 1, 1])

    expect(calls.total).toBe(1)

    version = 2

    expireSoon(state.entries)

    // perto de vencer, ninguém recebe o valor antigo: todos esperam o novo
    expect(await burst()).toEqual([2, 2, 2, 2])

    expect(calls.total).toBe(2)
  })

  it('reloads after an invalidation', async () => {
    const cache = createCache(memoryStore().store, config)

    let version = 1

    const load = async () => version

    await cache.getOrLoad('k', load)

    version = 2

    await cache.invalidate()

    expect(await cache.getOrLoad('k', load)).toBe(2)
  })

  it('reads from the loader while redis is down, and never serves what failed to invalidate', async () => {
    const { store, state } = memoryStore()

    const cache = createCache(store, config)

    const error = spyOn(console, 'error').mockImplementation(() => {})

    let version = 1

    const load = async () => version

    await cache.getOrLoad('k', load)

    state.down = true

    version = 2

    await cache.invalidate()

    expect(await cache.getOrLoad('k', load)).toBe(2)

    state.down = false

    expect(await cache.getOrLoad('k', load)).toBe(2)

    error.mockRestore()
  })

  it('does not cache failures or empty results, and releases the lock', async () => {
    const { store, state } = memoryStore()

    const cache = createCache(store, config)

    const failing = cache.getOrLoad('k', async () => {
      throw new Error('database down')
    })

    await expect(failing).rejects.toThrow('database down')

    expect(await cache.getOrLoad('k', async () => undefined)).toBeUndefined()

    expect(state.entries.size).toBe(0)

    expect(await cache.getOrLoad('k', async () => 'ok')).toBe('ok')
  })

  it('goes straight to the loader without redis', async () => {
    const cache = createCache(null, config)

    const { calls, load } = slowLoader(() => 1)

    await cache.getOrLoad('k', load)

    await cache.getOrLoad('k', load)

    await cache.invalidate()

    expect(calls.total).toBe(2)
  })
})
