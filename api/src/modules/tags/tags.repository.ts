import { and, asc, count, eq, sql } from 'drizzle-orm'

import { db } from '../../db'
import { postSchema, postTagSchema, tagSchema } from '../../db/schema'

type TagData = { name: string; slug: string }

const countedTags = (publishedOnly: boolean) =>
  db
    .select({
      id: tagSchema.id,
      name: tagSchema.name,
      slug: tagSchema.slug,
      postCount: count(postSchema.id),
      firstStudiedAt: sql<string | null>`min(${postSchema.studiedFrom})::text`,
      lastStudiedAt: sql<
        string | null
      >`max(coalesce(${postSchema.studiedTo}, ${postSchema.studiedFrom}))::text`,
    })
    .from(tagSchema)
    .leftJoin(postTagSchema, eq(postTagSchema.tagId, tagSchema.id))
    .leftJoin(
      postSchema,
      and(
        eq(postSchema.id, postTagSchema.postId),
        publishedOnly ? eq(postSchema.status, 'published') : undefined,
      ),
    )
    .groupBy(tagSchema.id)
    .orderBy(asc(tagSchema.name))

export const tagsRepository = {
  async listWithCounts(publishedOnly: boolean) {
    const rows = await countedTags(publishedOnly)

    return rows
      .filter((row) => !publishedOnly || row.postCount > 0)
      .map(({ firstStudiedAt, lastStudiedAt, ...tag }) => tag)
  },

  async listSkills() {
    const rows = await countedTags(true)

    return rows.filter((row) => row.postCount > 0)
  },

  async create(data: TagData) {
    const [tag] = await db.insert(tagSchema).values(data).returning()

    return tag
  },

  async update(id: string, data: TagData) {
    const [tag] = await db.update(tagSchema).set(data).where(eq(tagSchema.id, id)).returning()

    return tag
  },

  async delete(id: string) {
    const [tag] = await db.delete(tagSchema).where(eq(tagSchema.id, id)).returning()

    return tag
  },
}
