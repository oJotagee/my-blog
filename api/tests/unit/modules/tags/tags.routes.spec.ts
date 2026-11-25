import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { randomUUID } from 'node:crypto'

import { createTestApp, signIn } from '../../support/app'
import { useInMemoryRepositories } from '../../support/memory-repositories'

describe('tags routes', () => {
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

  function addTag(name: string, slug: string) {
    const tag = { id: randomUUID(), name, slug, createdAt: new Date(), updatedAt: new Date() }

    store.tags.push(tag)

    return tag
  }

  function addPost(
    tagId: string,
    post: { status?: 'draft' | 'published'; from?: string; to?: string },
  ) {
    const id = randomUUID()

    store.posts.push({
      id,
      status: post.status ?? 'published',
      studiedFrom: post.from ?? null,
      studiedTo: post.to ?? null,
    })

    store.postTags.push({ postId: id, tagId })
  }

  it('GET /tags is public and lists only tags used by published posts', async () => {
    const backend = addTag('Backend', 'backend')

    const draftOnly = addTag('Rascunho', 'rascunho')

    addTag('Sem post', 'sem-post')

    addPost(backend.id, {})

    addPost(backend.id, {})

    addPost(draftOnly.id, { status: 'draft' })

    const response = await app.inject({ method: 'GET', url: '/tags' })

    expect(response.statusCode).toBe(200)

    expect(response.json()).toEqual([
      { id: backend.id, name: 'Backend', slug: 'backend', postCount: 2 },
    ])
  })

  it('requires authentication on the admin routes', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/admin/tags' }),
      app.inject({ method: 'POST', url: '/admin/tags', payload: { name: 'X' } }),
      app.inject({ method: 'PATCH', url: `/admin/tags/${randomUUID()}`, payload: { name: 'X' } }),
      app.inject({ method: 'DELETE', url: `/admin/tags/${randomUUID()}` }),
      app.inject({ method: 'GET', url: '/admin/skills' }),
    ])

    expect(responses.map((response) => response.statusCode)).toEqual([401, 401, 401, 401, 401])
  })

  it('GET /admin/tags lists every tag, counting drafts too', async () => {
    const { headers } = signIn(app, store)

    const tag = addTag('Backend', 'backend')

    addPost(tag.id, { status: 'draft' })

    addTag('Docker', 'docker')

    const response = await app.inject({ method: 'GET', url: '/admin/tags', headers })

    expect(response.json()).toEqual([
      { id: tag.id, name: 'Backend', slug: 'backend', postCount: 1 },
      { id: expect.any(String), name: 'Docker', slug: 'docker', postCount: 0 },
    ])
  })

  it('POST /admin/tags creates a tag and generates the slug', async () => {
    const { headers } = signIn(app, store)

    const response = await app.inject({
      method: 'POST',
      url: '/admin/tags',
      headers,
      payload: { name: '  Banco de Dados ' },
    })

    expect(response.statusCode).toBe(201)

    expect(response.json()).toMatchObject({ name: 'Banco de Dados', slug: 'banco-de-dados' })
  })

  it('POST /admin/tags returns 409 for a repeated name or slug', async () => {
    const { headers } = signIn(app, store)

    addTag('Backend', 'backend')

    const sameName = await app.inject({
      method: 'POST',
      url: '/admin/tags',
      headers,
      payload: { name: 'Backend' },
    })

    const sameSlug = await app.inject({
      method: 'POST',
      url: '/admin/tags',
      headers,
      payload: { name: 'BACKEND' },
    })

    expect(sameName.statusCode).toBe(409)

    expect(sameName.json()).toEqual({ message: 'Tag already exists' })

    expect(sameSlug.statusCode).toBe(409)
  })

  it('POST /admin/tags returns 400 for an empty name or a name without letters', async () => {
    const { headers } = signIn(app, store)

    const empty = await app.inject({
      method: 'POST',
      url: '/admin/tags',
      headers,
      payload: { name: '   ' },
    })

    const symbols = await app.inject({
      method: 'POST',
      url: '/admin/tags',
      headers,
      payload: { name: '!!!' },
    })

    expect(empty.statusCode).toBe(400)

    expect(symbols.statusCode).toBe(400)

    expect(symbols.json()).toEqual({ message: 'Name must contain letters or numbers' })
  })

  it('PATCH /admin/tags/:id renames the tag and regenerates the slug', async () => {
    const { headers } = signIn(app, store)

    const tag = addTag('Back', 'back')

    const response = await app.inject({
      method: 'PATCH',
      url: `/admin/tags/${tag.id}`,
      headers,
      payload: { name: 'Backend' },
    })

    expect(response.statusCode).toBe(200)

    expect(response.json()).toMatchObject({ id: tag.id, name: 'Backend', slug: 'backend' })
  })

  it('PATCH /admin/tags/:id returns 409 for a name already in use and 404 for an unknown id', async () => {
    const { headers } = signIn(app, store)

    addTag('Backend', 'backend')

    const other = addTag('Frontend', 'frontend')

    const conflict = await app.inject({
      method: 'PATCH',
      url: `/admin/tags/${other.id}`,
      headers,
      payload: { name: 'Backend' },
    })

    const unknown = await app.inject({
      method: 'PATCH',
      url: `/admin/tags/${randomUUID()}`,
      headers,
      payload: { name: 'Qualquer' },
    })

    expect(conflict.statusCode).toBe(409)

    expect(unknown.statusCode).toBe(404)
  })

  it('PATCH and DELETE return 400 for an id that is not a uuid', async () => {
    const { headers } = signIn(app, store)

    const patch = await app.inject({
      method: 'PATCH',
      url: '/admin/tags/abc',
      headers,
      payload: { name: 'X' },
    })

    const remove = await app.inject({ method: 'DELETE', url: '/admin/tags/abc', headers })

    expect(patch.statusCode).toBe(400)

    expect(remove.statusCode).toBe(400)
  })

  it('DELETE /admin/tags/:id removes the tag and its links, keeping the posts', async () => {
    const { headers } = signIn(app, store)

    const tag = addTag('Backend', 'backend')

    addPost(tag.id, {})

    const response = await app.inject({
      method: 'DELETE',
      url: `/admin/tags/${tag.id}`,
      headers,
    })

    expect(response.statusCode).toBe(204)

    expect(store.tags).toHaveLength(0)

    expect(store.postTags).toHaveLength(0)

    expect(store.posts).toHaveLength(1)

    const again = await app.inject({ method: 'DELETE', url: `/admin/tags/${tag.id}`, headers })

    expect(again.statusCode).toBe(404)
  })

  it('GET /admin/skills returns the published tags with the study period', async () => {
    const { headers } = signIn(app, store)

    const backend = addTag('Backend', 'backend')

    const draftOnly = addTag('Rascunho', 'rascunho')

    addPost(backend.id, { from: '2026-02-02', to: '2026-02-07' })

    addPost(backend.id, { from: '2026-03-10' })

    addPost(backend.id, { status: 'draft', from: '2025-01-01' })

    addPost(draftOnly.id, { status: 'draft', from: '2026-01-01' })

    const response = await app.inject({ method: 'GET', url: '/admin/skills', headers })

    expect(response.statusCode).toBe(200)

    expect(response.json()).toEqual([
      {
        id: backend.id,
        name: 'Backend',
        slug: 'backend',
        postCount: 2,
        firstStudiedAt: '2026-02-02',
        lastStudiedAt: '2026-03-10',
      },
    ])
  })
})
