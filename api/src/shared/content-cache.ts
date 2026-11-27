import { env } from '../config/env'
import { redis } from '../db/redis'
import { createCache } from './cache'

// Visitas mudam sem ninguém editar nada, então o que depende delas vence logo.
export const VIEWS_TTL_MS = 5 * 60 * 1000

export const contentCache = createCache(redis, {
  ttlMs: env.CACHE_TTL_SECONDS * 1000,
  refreshAheadMs: 30_000,
  lockTtlMs: 10_000,
  waitTimeoutMs: 5_000,
  pollMs: 50,
})
