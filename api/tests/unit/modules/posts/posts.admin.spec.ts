import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { randomUUID } from 'node:crypto'

import { createTestApp, signIn } from '../../support/app'
import { buildPost } from '../../support/builders'
import { useInMemoryRepositories } from '../../support/memory-repositories'

describe('admin posts routes', () => {
  let store: ReturnType<typeof useInMemoryRepositories>

  let app: Awaited<ReturnType<typeof createTestApp>>

  let headers: { authorization: string }

  beforeEach(async () => {
    store = useInMemoryRepositories()

    app = await createTestApp()

    headers = signIn(app, store).headers
  })

  afterEach(async () => {
    await app.close()

    mock.restore()
  })

  const send = (
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'GET',
    url: string,
    payload?: object,
  ) => app.inject({ method, url, headers, payload })

  function addMedia(status: 'ready' | 'pending' = 'ready') {
    const media = {
      id: randomUUID(),
      key: `posts/${randomUUID()}.png`,
      alt: null,
      width: null,
      height: null,
      status,
    }

    store.media.push(media)

    return media
  }

  it('requires authentication on every admin route', async () => {
    const id = randomUUID()

    const calls = [
      ['GET', '/admin/posts'],
      ['POST', '/admin/posts'],
      ['GET', `/admin/posts/${id}`],
      ['PATCH', `/admin/posts/${id}`],
      ['DELETE', `/admin/posts/${id}`],
      ['PUT', `/admin/posts/${id}/content`],
      ['PUT', `/admin/posts/${id}/tags`],
      ['POST', `/admin/posts/${id}/publish`],
      ['POST', `/admin/posts/${id}/unpublish`],
    ] as const

    const responses = await Promise.all(calls.map(([method, url]) => app.inject({ method, url })))

    expect(responses.map((response) => response.statusCode)).toEqual(calls.map(() => 401))
  })

  it('POST /admin/posts creates a draft and generates the slug from the title', async () => {
    const response = await send('POST', '/admin/posts', {
      title: 'Arquitetura hexagonal sem complicação',
      studiedFrom: '2026-03-12',
      studiedTo: '2026-03-17',
    })

    expect(response.statusCode).toBe(201)

    expect(response.json()).toMatchObject({
      slug: 'arquitetura-hexagonal-sem-complicacao',
      status: 'draft',
      publishedAt: null,
      studiedFrom: '2026-03-12',
      studiedTo: '2026-03-17',
      sections: [],
      references: [],
      tags: [],
    })
  })

  it('POST /admin/posts validates the body, the slug and the study range', async () => {
    const invalid = await Promise.all([
      send('POST', '/admin/posts', {}),
      send('POST', '/admin/posts', { title: 'X', slug: 'Slug Inválido' }),
      send('POST', '/admin/posts', {
        title: 'X',
        studiedFrom: '2026-03-17',
        studiedTo: '2026-03-12',
      }),
      send('POST', '/admin/posts', { title: 'X', coverMediaId: randomUUID() }),
      send('POST', '/admin/posts', { title: '!!!' }),
    ])

    expect(invalid.map((response) => response.statusCode)).toEqual([400, 400, 400, 400, 400])
  })

  it('POST /admin/posts returns 409 for a repeated slug', async () => {
    store.posts.push(buildPost({ slug: 'repetido' }))

    const response = await send('POST', '/admin/posts', { title: 'Outro', slug: 'repetido' })

    expect(response.statusCode).toBe(409)

    expect(response.json()).toEqual({ message: 'Slug already in use' })
  })

  it('PATCH /admin/posts/:id updates only the sent fields and clears with null', async () => {
    const post = buildPost({ title: 'Antes', summary: 'Resumo', studiedFrom: '2026-01-01' })

    store.posts.push(post)

    const response = await send('PATCH', `/admin/posts/${post.id}`, {
      title: 'Depois',
      summary: null,
      coverCaption: 'ESTUDO — 01',
    })

    expect(response.statusCode).toBe(200)

    expect(response.json()).toMatchObject({
      title: 'Depois',
      summary: null,
      studiedFrom: '2026-01-01',
      cover: null,
    })

    expect(post.coverCaption).toBe('ESTUDO — 01')
  })

  it('PATCH /admin/posts/:id returns 404, 409 and 400', async () => {
    store.posts.push(buildPost({ slug: 'ocupado' }))

    const mine = buildPost({ slug: 'meu' })

    store.posts.push(mine)

    const responses = await Promise.all([
      send('PATCH', `/admin/posts/${randomUUID()}`, { title: 'X' }),
      send('PATCH', `/admin/posts/${mine.id}`, { slug: 'ocupado' }),
      send('PATCH', `/admin/posts/${mine.id}`, {}),
      send('PATCH', '/admin/posts/abc', { title: 'X' }),
    ])

    expect(responses.map((response) => response.statusCode)).toEqual([404, 409, 400, 400])
  })

  it('PUT content replaces sections, blocks and references in order', async () => {
    const post = buildPost({ status: 'draft', publishedAt: null })

    store.posts.push(post)

    const image = addMedia()

    const body = {
      sections: [
        {
          label: 'Contexto',
          title: 'Por que estudar',
          blocks: [
            { type: 'text', content: 'Primeiro' },
            { type: 'image', mediaId: image.id, caption: 'Figura', groupId: 1 },
            { type: 'text', content: 'Ao lado', groupId: 1 },
            { type: 'code', content: 'const a = 1', language: 'TypeScript', filename: 'a.ts' },
            { type: 'callout', content: 'Cuidado', label: 'NOTA' },
            { type: 'cards', items: [{ title: 'Entrada', description: 'HTTP' }] },
          ],
        },
        { blocks: [{ type: 'text', content: 'Conclusão' }] },
      ],
      references: [
        { title: 'Livro', author: 'Autor', note: '2005', url: 'https://example.com/a' },
        { title: 'Artigo', url: 'https://example.com/b' },
      ],
    }

    const response = await send('PUT', `/admin/posts/${post.id}/content`, body)

    expect(response.statusCode).toBe(200)

    const result = response.json()

    expect(result.sections).toHaveLength(2)

    expect(result.sections[0]).toMatchObject({ label: 'Contexto', title: 'Por que estudar' })

    expect(result.sections[0].blocks.map((block: { type: string }) => block.type)).toEqual([
      'text',
      'image',
      'text',
      'code',
      'callout',
      'cards',
    ])

    expect(result.sections[0].blocks[1]).toMatchObject({ groupId: 1, caption: 'Figura' })

    expect(result.sections[0].blocks[1].image.url).toBe(`https://cdn.example.com/${image.key}`)

    expect(result.sections[0].blocks[2].groupId).toBe(1)

    expect(result.sections[0].blocks[3].meta).toEqual({ language: 'TypeScript', filename: 'a.ts' })

    expect(result.sections[0].blocks[4].meta).toEqual({ label: 'NOTA' })

    expect(result.sections[0].blocks[5].meta).toEqual({
      items: [{ title: 'Entrada', description: 'HTTP' }],
    })

    expect(result.references.map((reference: { title: string }) => reference.title)).toEqual([
      'Livro',
      'Artigo',
    ])

    expect(result.references[1]).toMatchObject({ author: null, note: null })
  })

  it('PUT content replaces the previous content instead of adding to it', async () => {
    const post = buildPost()

    store.posts.push(post)

    const first = {
      sections: [{ blocks: [{ type: 'text', content: 'Velho' }] }],
      references: [{ title: 'Velha', url: 'https://example.com' }],
    }

    await send('PUT', `/admin/posts/${post.id}/content`, first)

    const second = await send('PUT', `/admin/posts/${post.id}/content`, {
      sections: [],
      references: [],
    })

    expect(second.json()).toMatchObject({ sections: [], references: [] })

    expect(store.blocks).toHaveLength(0)

    expect(store.sections).toHaveLength(0)
  })

  it('PUT content accepts a quote block and marks the post as updated', async () => {
    const post = buildPost()

    store.posts.push(post)

    const before = post.updatedAt.getTime()

    const response = await send('PUT', `/admin/posts/${post.id}/content`, {
      sections: [{ blocks: [{ type: 'quote', content: 'Uma frase' }] }],
      references: [],
    })

    expect(response.json().sections[0].blocks[0]).toMatchObject({
      type: 'quote',
      content: 'Uma frase',
    })

    expect(post.updatedAt.getTime()).toBeGreaterThan(before)
  })

  it('GET /admin/posts searches by title and returns views and counts', async () => {
    const found = buildPost({ title: 'Filas com RabbitMQ' })

    store.posts.push(found, buildPost({ title: 'Outro', status: 'draft', publishedAt: null }))

    store.views.push(
      { postId: found.id, date: '2026-03-01', views: 2 },
      { postId: found.id, date: '2026-03-02', views: 3 },
    )

    const body = (await send('GET', '/admin/posts?q=rabbit')).json()

    expect(body.items).toHaveLength(1)

    expect(body.items[0]).toMatchObject({ title: 'Filas com RabbitMQ', views: 5 })

    expect(body.counts).toEqual({ all: 2, published: 1, draft: 1 })
  })

  it('PUT content rejects invalid blocks, references, pending media and unknown posts', async () => {
    const post = buildPost()

    store.posts.push(post)

    const pending = addMedia('pending')

    const put = (body: object, id = post.id) => send('PUT', `/admin/posts/${id}/content`, body)

    const responses = await Promise.all([
      put({ sections: [{ blocks: [{ type: 'text', content: '   ' }] }], references: [] }),
      put({ sections: [{ blocks: [{ type: 'video', content: 'x' }] }], references: [] }),
      put({ sections: [{ blocks: [{ type: 'cards', items: [] }] }], references: [] }),
      put({ sections: [], references: [{ title: 'X', url: 'javascript:alert(1)' }] }),
      put({ sections: [{ blocks: [{ type: 'image', mediaId: randomUUID() }] }], references: [] }),
      put({ sections: [{ blocks: [{ type: 'image', mediaId: pending.id }] }], references: [] }),
      put({ sections: [], references: [] }, randomUUID()),
    ])

    expect(responses.map((response) => response.statusCode)).toEqual([
      400, 400, 400, 400, 400, 400, 404,
    ])

    expect(responses[5]?.json()).toEqual({ message: 'Unknown or unfinished media' })
  })

  it('PUT tags replaces the tags and rejects unknown ones', async () => {
    const post = buildPost()

    store.posts.push(post)

    const backend = {
      id: randomUUID(),
      name: 'Backend',
      slug: 'backend',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docker = {
      id: randomUUID(),
      name: 'Docker',
      slug: 'docker',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    store.tags.push(backend, docker)

    const first = await send('PUT', `/admin/posts/${post.id}/tags`, {
      tagIds: [backend.id, docker.id],
    })

    expect(first.json().tags.map((tag: { name: string }) => tag.name)).toEqual([
      'Backend',
      'Docker',
    ])

    const second = await send('PUT', `/admin/posts/${post.id}/tags`, { tagIds: [docker.id] })

    expect(second.json().tags.map((tag: { name: string }) => tag.name)).toEqual(['Docker'])

    const unknown = await send('PUT', `/admin/posts/${post.id}/tags`, { tagIds: [randomUUID()] })

    const repeated = await send('PUT', `/admin/posts/${post.id}/tags`, {
      tagIds: [docker.id, docker.id],
    })

    expect(unknown.statusCode).toBe(400)

    expect(repeated.statusCode).toBe(400)
  })

  it('publish needs content, sets the date once and unpublish goes back to draft', async () => {
    const post = buildPost({ status: 'draft', publishedAt: null })

    store.posts.push(post)

    const empty = await send('POST', `/admin/posts/${post.id}/publish`)

    expect(empty.statusCode).toBe(400)

    expect(empty.json()).toEqual({ message: 'Add content before publishing' })

    await send('PUT', `/admin/posts/${post.id}/content`, {
      sections: [{ blocks: [{ type: 'text', content: 'Texto' }] }],
      references: [],
    })

    const published = await send('POST', `/admin/posts/${post.id}/publish`)

    expect(published.statusCode).toBe(200)

    expect(published.json().status).toBe('published')

    const firstDate = published.json().publishedAt

    expect(firstDate).not.toBeNull()

    const back = await send('POST', `/admin/posts/${post.id}/unpublish`)

    expect(back.json()).toMatchObject({ status: 'draft', publishedAt: firstDate })

    const again = await send('POST', `/admin/posts/${post.id}/publish`)

    expect(again.json().publishedAt).toBe(firstDate)

    const unknown = await send('POST', `/admin/posts/${randomUUID()}/publish`)

    expect(unknown.statusCode).toBe(404)
  })

  it('a published post shows up in the public list and a draft does not', async () => {
    const post = buildPost({ status: 'draft', publishedAt: null, title: 'Visível' })

    store.posts.push(post)

    await send('PUT', `/admin/posts/${post.id}/content`, {
      sections: [{ blocks: [{ type: 'text', content: 'Texto' }] }],
      references: [],
    })

    const before = await app.inject({ method: 'GET', url: '/posts' })

    expect(before.json().total).toBe(0)

    await send('POST', `/admin/posts/${post.id}/publish`)

    const after = await app.inject({ method: 'GET', url: '/posts' })

    expect(after.json().items.map((item: { title: string }) => item.title)).toEqual(['Visível'])
  })

  it('GET /admin/posts lists drafts too, filters by status and paginates', async () => {
    store.posts.push(
      buildPost({ title: 'A', status: 'draft', updatedAt: new Date('2026-01-01') }),
      buildPost({ title: 'B', status: 'published', updatedAt: new Date('2026-01-02') }),
      buildPost({ title: 'C', status: 'draft', updatedAt: new Date('2026-01-03') }),
    )

    const all = (await send('GET', '/admin/posts')).json()

    expect(all.items.map((post: { title: string }) => post.title)).toEqual(['C', 'B', 'A'])

    expect(all.items[0]).toMatchObject({ status: 'draft' })

    const drafts = (await send('GET', '/admin/posts?status=draft&limit=1&page=2')).json()

    expect(drafts.items.map((post: { title: string }) => post.title)).toEqual(['A'])

    expect(drafts).toMatchObject({ total: 2, totalPages: 2 })

    const invalid = await send('GET', '/admin/posts?status=outro')

    expect(invalid.statusCode).toBe(400)
  })

  it('GET /admin/posts/:id returns the post for the editor and 404 for an unknown id', async () => {
    const post = buildPost({ status: 'draft', publishedAt: null })

    store.posts.push(post)

    const found = await send('GET', `/admin/posts/${post.id}`)

    expect(found.statusCode).toBe(200)

    expect(found.json()).toMatchObject({ id: post.id, status: 'draft', coverMediaId: null })

    const unknown = await send('GET', `/admin/posts/${randomUUID()}`)

    expect(unknown.statusCode).toBe(404)
  })

  it('DELETE /admin/posts/:id removes the post with its content', async () => {
    const post = buildPost()

    store.posts.push(post)

    await send('PUT', `/admin/posts/${post.id}/content`, {
      sections: [{ blocks: [{ type: 'text', content: 'Texto' }] }],
      references: [{ title: 'Ref', url: 'https://example.com' }],
    })

    const response = await send('DELETE', `/admin/posts/${post.id}`)

    expect(response.statusCode).toBe(204)

    expect(store.posts).toHaveLength(0)

    expect(store.sections).toHaveLength(0)

    expect(store.blocks).toHaveLength(0)

    expect(store.references).toHaveLength(0)

    const again = await send('DELETE', `/admin/posts/${post.id}`)

    expect(again.statusCode).toBe(404)
  })
})
