import { and, count, desc, eq, gte, sql } from 'drizzle-orm'

import { db } from '../../db'
import { postSchema, postViewsDailySchema, tagSchema } from '../../db/schema'

const totalViews = sql<number>`coalesce(sum(${postViewsDailySchema.views}), 0)::int`

export const analyticsRepository = {
  async findPublishedIdBySlug(slug: string) {
    const [post] = await db
      .select({ id: postSchema.id })
      .from(postSchema)
      .where(and(eq(postSchema.slug, slug), eq(postSchema.status, 'published')))
      .limit(1)

    return post?.id
  },

  async addView(postId: string, date: string) {
    await db
      .insert(postViewsDailySchema)
      .values({ postId, date, views: 1 })
      .onConflictDoUpdate({
        target: [postViewsDailySchema.postId, postViewsDailySchema.date],
        set: { views: sql`${postViewsDailySchema.views} + 1`, updatedAt: new Date() },
      })
  },

  async topPosts(limit: number, since?: string) {
    return db
      .select({
        id: postSchema.id,
        slug: postSchema.slug,
        title: postSchema.title,
        views: totalViews,
      })
      .from(postViewsDailySchema)
      .innerJoin(postSchema, eq(postSchema.id, postViewsDailySchema.postId))
      .where(
        and(
          eq(postSchema.status, 'published'),
          since ? gte(postViewsDailySchema.date, since) : undefined,
        ),
      )
      .groupBy(postSchema.id)
      .orderBy(desc(totalViews), desc(postSchema.publishedAt))
      .limit(limit)
  },

  async viewsByDay(since: string) {
    return db
      .select({ date: postViewsDailySchema.date, views: totalViews })
      .from(postViewsDailySchema)
      .where(gte(postViewsDailySchema.date, since))
      .groupBy(postViewsDailySchema.date)
  },

  async totalViews() {
    const [row] = await db.select({ views: totalViews }).from(postViewsDailySchema)

    return row?.views ?? 0
  },

  async countPostsByStatus() {
    return db
      .select({ status: postSchema.status, total: count() })
      .from(postSchema)
      .groupBy(postSchema.status)
  },

  async countTags() {
    const [row] = await db.select({ total: count() }).from(tagSchema)

    return row?.total ?? 0
  },
}
