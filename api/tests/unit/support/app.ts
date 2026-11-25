import { randomUUID } from 'node:crypto'

import { buildApp } from '../../../src/app'
import type { useInMemoryRepositories } from './memory-repositories'

type Store = ReturnType<typeof useInMemoryRepositories>

export async function createTestApp() {
  const app = buildApp()

  app.log.level = 'silent'

  await app.ready()

  return app
}

export function signIn(app: Awaited<ReturnType<typeof createTestApp>>, store: Store) {
  const session = {
    id: randomUUID(),
    refreshTokenHash: 'hashed-secret',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    revokedAt: null,
    userAgent: null,
  }

  store.sessions.push(session)

  const token = app.jwt.sign({ sub: 'admin', sid: session.id })

  return { session, headers: { authorization: `Bearer ${token}` } }
}
