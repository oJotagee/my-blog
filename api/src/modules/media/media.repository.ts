import { and, count, eq } from 'drizzle-orm'

import { db } from '../../db'
import { blockSchema, mediaSchema, postSchema } from '../../db/schema'

type NewMedia = typeof mediaSchema.$inferInsert

export const mediaRepository = {
  async findById(id: string) {
    const [media] = await db.select().from(mediaSchema).where(eq(mediaSchema.id, id)).limit(1)

    return media
  },

  async countPending() {
    const [result] = await db
      .select({ total: count() })
      .from(mediaSchema)
      .where(eq(mediaSchema.status, 'pending'))

    return result?.total ?? 0
  },

  async countUsages(id: string) {
    const [[blocks], [covers]] = await Promise.all([
      db.select({ total: count() }).from(blockSchema).where(eq(blockSchema.mediaId, id)),
      db.select({ total: count() }).from(postSchema).where(eq(postSchema.coverMediaId, id)),
    ])

    return (blocks?.total ?? 0) + (covers?.total ?? 0)
  },

  async create(data: NewMedia) {
    const [media] = await db.insert(mediaSchema).values(data).returning()

    return media
  },

  async markReady(id: string, changes: { key: string; mimeType: string }) {
    const [media] = await db
      .update(mediaSchema)
      .set({ ...changes, status: 'ready' })
      .where(and(eq(mediaSchema.id, id), eq(mediaSchema.status, 'pending')))
      .returning()

    return media
  },

  async markFailed(id: string) {
    await db
      .update(mediaSchema)
      .set({ status: 'failed' })
      .where(and(eq(mediaSchema.id, id), eq(mediaSchema.status, 'pending')))
  },

  async delete(id: string) {
    await db.delete(mediaSchema).where(eq(mediaSchema.id, id))
  },
}
