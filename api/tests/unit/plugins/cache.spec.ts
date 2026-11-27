import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'

import { contentCache } from '../../../src/shared/content-cache'
import { createTestApp, signIn } from '../support/app'
import { useInMemoryRepositories } from '../support/memory-repositories'

describe('cache invalidation', () => {
  let store: ReturnType<typeof useInMemoryRepositories>

  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    store = useInMemoryRepositories()

    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()

    mock.restore()
  })

  it('invalidates after admin writes only', async () => {
    const { headers } = signIn(app, store)

    const invalidate = spyOn(contentCache, 'invalidate').mockResolvedValue()

    await app.inject({ method: 'GET', url: '/admin/tags', headers })

    await app.inject({ method: 'GET', url: '/tags' })

    await app.inject({ method: 'POST', url: '/admin/tags', payload: { name: 'Sem login' } })

    expect(invalidate).toHaveBeenCalledTimes(0)

    const created = await app.inject({
      method: 'POST',
      url: '/admin/tags',
      headers,
      payload: { name: 'Redis' },
    })

    const url = `/admin/tags/${created.json().id}`

    await app.inject({ method: 'PATCH', url, headers, payload: { name: 'Cache' } })

    await app.inject({ method: 'DELETE', url, headers })

    expect(invalidate).toHaveBeenCalledTimes(3)
  })
})
