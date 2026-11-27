import { Redis } from 'ioredis'

import { env } from '../config/env'

function createRedis(url: string) {
  const redis = new Redis(url, {
    // 0 resolve IPv4 e IPv6: a rede privada do Railway usa IPv6.
    family: 0,
    commandTimeout: 300,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  })

  redis.on('error', (error) => {
    console.error('Redis connection error', error.message)
  })

  return redis
}

export const redis = env.REDIS_URL ? createRedis(env.REDIS_URL) : null
