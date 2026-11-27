import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'

import { analyticsRepository } from '../../../../src/modules/analytics/analytics.repository'
import { createTestApp, signIn } from '../../support/app'
import { buildPost } from '../../support/builders'
import { useInMemoryRepositories } from '../../support/memory-repositories'

const isoDay = (offset = 0) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10)

describe('analytics routes', () => {
  let store: ReturnType<typeof useInMemoryRepositories>

  let views: { postId: string; date: string; views: number }[]

  let app: Awaited<ReturnType<typeof createTestApp>>

  beforeEach(async () => {
    store = useInMemoryRepositories()

    views = []

    spyOn(analyticsRepository, 'findPublishedIdBySlug').mockImplementation(
      async (slug) =>
        store.posts.find((post) => post.slug === slug && post.status === 'published')?.id,
    )

    spyOn(analyticsRepository, 'addView').mockImplementation(async (postId, date) => {
      const row = views.find((item) => item.postId === postId && item.date === date)

      if (row) row.views += 1
      else views.push({ postId, date, views: 1 })
    })

    spyOn(analyticsRepository, 'topPosts').mockImplementation(async (limit, since) =>
      store.posts
        .filter((post) => post.status === 'published')
        .map(({ id, slug, title, publishedAt }) => ({
          id,
          slug,
          title,
          publishedAt,
          views: views
            .filter((row) => row.postId === id && (!since || row.date >= since))
            .reduce((sum, row) => sum + row.views, 0),
        }))
        .filter((post) => post.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, limit),
    )

    spyOn(analyticsRepository, 'viewsByDay').mockImplementation(async (since) => {
      const byDate = new Map<string, number>()

      for (const row of views.filter((item) => item.date >= since)) {
        byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.views)
      }

      return [...byDate].map(([date, count]) => ({ date, views: count }))
    })

    spyOn(analyticsRepository, 'totalViews').mockImplementation(async () =>
      views.reduce((sum, row) => sum + row.views, 0),
    )

    spyOn(analyticsRepository, 'countPostsByStatus').mockImplementation(async () => [
      { status: 'published', total: store.posts.filter((p) => p.status === 'published').length },
      { status: 'draft', total: store.posts.filter((p) => p.status === 'draft').length },
    ])

    spyOn(analyticsRepository, 'countTags').mockImplementation(async () => store.tags.length)

    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()

    mock.restore()
  })

  const view = (slug: string) => app.inject({ method: 'POST', url: `/analytics/views/${slug}` })

  it('counts a view of a published post and ignores drafts and unknown slugs', async () => {
    const post = buildPost({ slug: 'um-post' })

    store.posts.push(post, buildPost({ slug: 'rascunho', status: 'draft', publishedAt: null }))

    const statuses = [await view('um-post'), await view('um-post'), await view('rascunho')].map(
      (response) => response.statusCode,
    )

    expect(statuses).toEqual([204, 204, 404])

    expect(views).toEqual([{ postId: post.id, date: isoDay(), views: 2 }])

    expect((await view('nao-existe')).statusCode).toBe(404)
  })

  it('lists the most viewed posts, limited', async () => {
    const a = buildPost({ slug: 'a', title: 'a' })

    const b = buildPost({ slug: 'b', title: 'b' })

    store.posts.push(a, b, buildPost({ slug: 'c', title: 'c' }))

    views.push(
      { postId: a.id, date: isoDay(), views: 1 },
      { postId: b.id, date: isoDay(), views: 5 },
    )

    const body = (await app.inject({ method: 'GET', url: '/analytics/popular?limit=1' })).json()

    expect(body).toEqual([
      { id: b.id, slug: 'b', title: 'b', publishedAt: b.publishedAt?.toISOString(), views: 5 },
    ])

    expect(
      (await app.inject({ method: 'GET', url: '/analytics/popular?limit=99' })).statusCode,
    ).toBe(400)
  })

  it('requires login for the dashboard', async () => {
    expect((await app.inject({ method: 'GET', url: '/admin/dashboard' })).statusCode).toBe(401)
  })

  it('builds the dashboard with 30 days, filling the empty ones', async () => {
    const { headers } = signIn(app, store)

    const post = buildPost({ slug: 'um-post', title: 'Um post' })

    store.posts.push(post, buildPost({ status: 'draft', publishedAt: null }))

    views.push(
      { postId: post.id, date: isoDay(), views: 4 },
      { postId: post.id, date: isoDay(3), views: 2 },
      { postId: post.id, date: isoDay(20), views: 1 },
      { postId: post.id, date: isoDay(60), views: 10 },
    )

    const body = (await app.inject({ method: 'GET', url: '/admin/dashboard', headers })).json()

    expect(body.posts).toEqual({ published: 1, drafts: 1 })

    expect(body.views).toEqual({ total: 17, last7Days: 6, last30Days: 7 })

    expect(body.daily).toHaveLength(30)

    expect(body.daily.at(-1)).toEqual({ date: isoDay(), views: 4 })

    expect(body.daily[0]).toEqual({ date: isoDay(29), views: 0 })

    expect(body.topPosts[0]).toMatchObject({ slug: 'um-post', views: 7 })
  })
})
