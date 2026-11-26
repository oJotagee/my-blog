import { NotFoundError } from '../../shared/errors'
import { analyticsRepository } from './analytics.repository'

const DAY_MS = 24 * 60 * 60 * 1000

const CHART_DAYS = 30

const today = () => new Date().toISOString().slice(0, 10)

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)

export const analyticsService = {
  async recordView(slug: string) {
    const postId = await analyticsRepository.findPublishedIdBySlug(slug)

    if (!postId) throw new NotFoundError('Post not found')

    await analyticsRepository.addView(postId, today())
  },

  popular(limit: number) {
    return analyticsRepository.topPosts(limit)
  },

  async dashboard() {
    const since = daysAgo(CHART_DAYS - 1)

    const [byStatus, tags, views, byDay, top] = await Promise.all([
      analyticsRepository.countPostsByStatus(),
      analyticsRepository.countTags(),
      analyticsRepository.totalViews(),
      analyticsRepository.viewsByDay(since),
      analyticsRepository.topPosts(5),
    ])

    const perDay = new Map(byDay.map((row) => [row.date, row.views]))

    const daily = Array.from({ length: CHART_DAYS }, (_, index) => {
      const date = daysAgo(CHART_DAYS - 1 - index)

      return { date, views: perDay.get(date) ?? 0 }
    })

    const countOf = (status: string) => byStatus.find((row) => row.status === status)?.total ?? 0

    return {
      posts: { published: countOf('published'), drafts: countOf('draft') },
      tags,
      views: {
        total: views,
        last7Days: daily.slice(-7).reduce((sum, day) => sum + day.views, 0),
        last30Days: daily.reduce((sum, day) => sum + day.views, 0),
      },
      daily,
      topPosts: top,
    }
  },
}
