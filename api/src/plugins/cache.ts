import { once } from 'node:events'
import type { FastifyInstance } from 'fastify'

import { redis } from '../db/redis'
import { contentCache } from '../shared/content-cache'

export function registerCache(app: FastifyInstance) {
  // Antes de responder, para o painel já ler o dado novo. Vale para qualquer rota de escrita
  // do admin, inclusive as que falharem no meio: invalidar a mais não causa erro.
  app.addHook('onSend', async (request, reply, payload) => {
    const isAdminWrite = request.method !== 'GET' && request.url.startsWith('/admin/')

    if (isAdminWrite && reply.statusCode !== 401) await contentCache.invalidate()

    return payload
  })

  // Um deploy pode mudar o formato das respostas guardadas.
  app.addHook('onReady', async () => {
    // Sem fila offline, um comando antes da conexão falharia; espera até 1 s por ela.
    if (redis && redis.status !== 'ready') {
      await once(redis, 'ready', { signal: AbortSignal.timeout(1000) }).catch(() => undefined)
    }

    await contentCache.invalidate()
  })

  app.addHook('onClose', async () => {
    redis?.disconnect()
  })
}
