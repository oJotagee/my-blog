import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { randomUUID } from 'node:crypto'

import { createTestApp } from '../../support/app'
import { buildPost } from '../../support/builders'
import { useInMemoryRepositories } from '../../support/memory-repositories'

describe('public posts routes', () => {
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

  function addPost(overrides: Parameters<typeof buildPost>[0] = {}, tagNames: string[] = []) {
    const post = buildPost(overrides)

    store.posts.push(post)

    for (const name of tagNames) {
      const tag = store.tags.find((item) => item.name === name) ?? {
        id: randomUUID(),
        name,
        slug: name.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      if (!store.tags.includes(tag)) store.tags.push(tag)

      store.postTags.push({ postId: post.id, tagId: tag.id })
    }

    return post
  }

  function list(query = '') {
    return app.inject({ method: 'GET', url: `/posts${query}` })
  }

  it('lists only published posts, newest first, with the page info', async () => {
    addPost({ title: 'Antigo', publishedAt: new Date('2026-01-01') })

    addPost({ title: 'Novo', publishedAt: new Date('2026-03-01') })

    addPost({ title: 'Rascunho', status: 'draft', publishedAt: null })

    const response = await list()

    expect(response.statusCode).toBe(200)

    const body = response.json()

    expect(body.items.map((post: { title: string }) => post.title)).toEqual(['Novo', 'Antigo'])

    expect(body).toMatchObject({ page: 1, limit: 10, total: 2, totalPages: 1 })
  })

  it('paginates with page and limit', async () => {
    for (let day = 1; day <= 5; day++) {
      addPost({ title: `Post ${day}`, publishedAt: new Date(`2026-03-0${day}`) })
    }

    const second = (await list('?page=2&limit=2')).json()

    expect(second.items.map((post: { title: string }) => post.title)).toEqual(['Post 3', 'Post 2'])

    expect(second).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 })

    const beyond = (await list('?page=9&limit=2')).json()

    expect(beyond.items).toEqual([])

    expect(beyond.total).toBe(5)
  })

  it('rejects an invalid page or a limit above 50', async () => {
    const statuses = await Promise.all(
      ['?page=0', '?limit=0', '?limit=51', '?page=abc'].map(
        async (query) => (await list(query)).statusCode,
      ),
    )

    expect(statuses).toEqual([400, 400, 400, 400])
  })

  it('searches the title, the summary and the tag names', async () => {
    addPost({ title: 'Arquitetura hexagonal' })

    addPost({ title: 'Outro', summary: 'Fala de RabbitMQ e filas' })

    addPost({ title: 'Terceiro' }, ['Docker'])

    addPost({ title: 'Quarto' })

    const titles = async (query: string) =>
      (await list(query))
        .json()
        .items.map((post: { title: string }) => post.title)
        .sort()

    expect(await titles('?q=hexagonal')).toEqual(['Arquitetura hexagonal'])

    expect(await titles('?q=rabbitmq')).toEqual(['Outro'])

    expect(await titles('?q=docker')).toEqual(['Terceiro'])

    expect(await titles('?q=nada')).toEqual([])
  })

  it('filters by tag slug and returns the tags of each post', async () => {
    addPost({ title: 'A' }, ['Backend', 'NestJS'])

    addPost({ title: 'B' }, ['Frontend'])

    const body = (await list('?tag=backend')).json()

    expect(body.items).toHaveLength(1)

    expect(body.items[0].tags.map((tag: { name: string }) => tag.name)).toEqual([
      'Backend',
      'NestJS',
    ])
  })

  it('GET /posts/:slug returns sections, blocks, references and the position', async () => {
    const media = {
      id: randomUUID(),
      key: 'posts/diagram.png',
      alt: 'Diagrama',
      width: 800,
      height: 400,
      status: 'ready' as const,
    }

    store.media.push(media)

    addPost({ title: 'Mais antigo', publishedAt: new Date('2026-01-01') })

    const post = addPost({
      slug: 'consistencia',
      title: 'Consistência',
      publishedAt: new Date('2026-02-01'),
      coverMediaId: media.id,
      coverCaption: 'ESTUDO — 02',
    })

    addPost({ title: 'Mais novo', publishedAt: new Date('2026-03-01') })

    const sectionId = randomUUID()

    store.sections.push({
      id: sectionId,
      postId: post.id,
      label: 'Contexto',
      title: 'Por quê',
      position: 0,
    })

    store.blocks.push(
      {
        id: randomUUID(),
        sectionId,
        position: 1,
        type: 'image',
        groupId: null,
        content: null,
        mediaId: media.id,
        caption: 'Fig 1',
        meta: null,
      },
      {
        id: randomUUID(),
        sectionId,
        position: 0,
        type: 'text',
        groupId: null,
        content: 'Olá',
        mediaId: null,
        caption: null,
        meta: null,
      },
    )

    store.references.push({
      id: randomUUID(),
      postId: post.id,
      title: 'Hexagonal Architecture',
      author: 'Alistair Cockburn',
      note: '2005',
      url: 'https://example.com/hex',
      position: 0,
    })

    const response = await app.inject({ method: 'GET', url: '/posts/consistencia' })

    expect(response.statusCode).toBe(200)

    const body = response.json()

    expect(body).toMatchObject({ slug: 'consistencia', number: 2, total: 3 })

    expect(body.cover).toEqual({
      id: media.id,
      url: 'https://cdn.example.com/posts/diagram.png',
      alt: 'Diagrama',
      width: 800,
      height: 400,
      caption: 'ESTUDO — 02',
    })

    expect(body.sections[0]).toMatchObject({ label: 'Contexto', title: 'Por quê' })

    expect(body.sections[0].blocks.map((block: { type: string }) => block.type)).toEqual([
      'text',
      'image',
    ])

    expect(body.sections[0].blocks[1].image.url).toBe('https://cdn.example.com/posts/diagram.png')

    expect(body.references).toEqual([
      {
        id: expect.any(String),
        title: 'Hexagonal Architecture',
        author: 'Alistair Cockburn',
        note: '2005',
        url: 'https://example.com/hex',
      },
    ])
  })

  it('GET /posts/:slug returns 404 for a draft and for an unknown slug', async () => {
    addPost({ slug: 'rascunho', status: 'draft', publishedAt: null })

    const draft = await app.inject({ method: 'GET', url: '/posts/rascunho' })

    const unknown = await app.inject({ method: 'GET', url: '/posts/nao-existe' })

    expect(draft.statusCode).toBe(404)

    expect(unknown.statusCode).toBe(404)
  })
})
