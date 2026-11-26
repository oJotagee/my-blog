import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { randomUUID } from 'node:crypto'

import { createTestApp, signIn } from '../../support/app'
import { buildPost } from '../../support/builders'
import { useInMemoryRepositories } from '../../support/memory-repositories'

const fullSite = {
  heroTitle: 'Estudo em público',
  heroSubtitle: 'Notas do que aprendo',
  aboutTitle: 'Sobre',
  aboutText: 'Texto',
  authorName: 'Guilherme',
  authorBio: 'Dev',
  city: 'São Paulo',
  githubUrl: 'https://github.com/example',
  portfolioUrl: 'https://example.com',
  featuredPostId: null,
}

describe('site routes', () => {
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

  it('returns an empty home before anything is saved', async () => {
    const response = await app.inject({ method: 'GET', url: '/site' })

    expect(response.statusCode).toBe(200)

    expect(response.json()).toMatchObject({ heroTitle: null, featuredPost: null })
  })

  it('requires login to read or change the settings', async () => {
    const get = await app.inject({ method: 'GET', url: '/admin/site' })

    const put = await app.inject({ method: 'PUT', url: '/admin/site', payload: fullSite })

    expect([get.statusCode, put.statusCode]).toEqual([401, 401])
  })

  it('saves the settings and serves them publicly', async () => {
    const { headers } = signIn(app, store)

    const saved = await app.inject({
      method: 'PUT',
      url: '/admin/site',
      headers,
      payload: fullSite,
    })

    expect(saved.statusCode).toBe(200)

    const admin = await app.inject({ method: 'GET', url: '/admin/site', headers })

    expect(admin.json()).toEqual(fullSite)

    const { featuredPost, ...publicSite } = (
      await app.inject({ method: 'GET', url: '/site' })
    ).json()

    expect(featuredPost).toBeNull()

    const { featuredPostId, ...expected } = fullSite

    expect(publicSite).toEqual(expected)
  })

  it('serves the chosen post as the featured one', async () => {
    const { headers } = signIn(app, store)

    const chosen = buildPost({ title: 'Escolhido', publishedAt: new Date('2026-01-01') })

    store.posts.push(chosen, buildPost({ title: 'Mais novo', publishedAt: new Date('2026-03-01') }))

    await app.inject({
      method: 'PUT',
      url: '/admin/site',
      headers,
      payload: { ...fullSite, featuredPostId: chosen.id },
    })

    const body = (await app.inject({ method: 'GET', url: '/site' })).json()

    expect(body.featuredPost.title).toBe('Escolhido')
  })

  it('falls back to the latest post when the chosen one is not published', async () => {
    const { headers } = signIn(app, store)

    const draft = buildPost({ status: 'draft', publishedAt: null })

    store.posts.push(draft, buildPost({ title: 'Mais novo' }))

    await app.inject({
      method: 'PUT',
      url: '/admin/site',
      headers,
      payload: { ...fullSite, featuredPostId: draft.id },
    })

    const body = (await app.inject({ method: 'GET', url: '/site' })).json()

    expect(body.featuredPost.title).toBe('Mais novo')
  })

  it('rejects a featured post that does not exist and invalid urls', async () => {
    const { headers } = signIn(app, store)

    const unknown = await app.inject({
      method: 'PUT',
      url: '/admin/site',
      headers,
      payload: { ...fullSite, featuredPostId: randomUUID() },
    })

    const badUrl = await app.inject({
      method: 'PUT',
      url: '/admin/site',
      headers,
      payload: { ...fullSite, githubUrl: 'javascript:alert(1)' },
    })

    expect([unknown.statusCode, badUrl.statusCode]).toEqual([400, 400])
  })
})
