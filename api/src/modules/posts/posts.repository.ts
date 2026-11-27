import { randomUUID } from 'node:crypto'

import { and, asc, count, desc, eq, gte, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'

import { db } from '../../db'
import {
  type BlockMeta,
  blockSchema,
  mediaSchema,
  postReferenceSchema,
  postSchema,
  postTagSchema,
  sectionSchema,
  tagSchema,
} from '../../db/schema'

export type PostRow = typeof postSchema.$inferSelect

export type PostTag = { id: string; name: string; slug: string }

export type PostListItem = PostRow & { tags: PostTag[] }

export type MediaInfo = {
  id: string
  key: string
  alt: string | null
  width: number | null
  height: number | null
}

export type BlockType = 'text' | 'image' | 'code' | 'callout' | 'cards' | 'quote'

export type PostBlock = {
  id: string
  type: BlockType
  groupId: number | null
  content: string | null
  caption: string | null
  meta: BlockMeta | null
  media: MediaInfo | null
}

export type PostSection = {
  id: string
  label: string | null
  title: string | null
  blocks: PostBlock[]
}

export type PostReference = {
  id: string
  title: string
  author: string | null
  note: string | null
  url: string
}

export type PostDetail = PostListItem & {
  cover: MediaInfo | null
  sections: PostSection[]
  references: PostReference[]
}

export type PublicPostDetail = PostDetail & { number: number; total: number }

export type NewPost = {
  slug: string
  title: string
  summary?: string | null
  studiedFrom?: string | null
  studiedTo?: string | null
  coverMediaId?: string | null
  coverCaption?: string | null
}

export type PostChanges = Partial<NewPost>

export type ContentInput = {
  sections: {
    label: string | null
    title: string | null
    blocks: {
      type: BlockType
      groupId: number | null
      content: string | null
      mediaId: string | null
      caption: string | null
      meta: BlockMeta | null
    }[]
  }[]
  references: { title: string; author: string | null; note: string | null; url: string }[]
}

type ListFilter = { q?: string; tag?: string; limit: number; offset: number }

type AdminFilter = { status?: 'draft' | 'published'; q?: string; limit: number; offset: number }

const mediaColumns = {
  id: mediaSchema.id,
  key: mediaSchema.key,
  alt: mediaSchema.alt,
  width: mediaSchema.width,
  height: mediaSchema.height,
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

async function tagsByPostIds(postIds: string[]) {
  const byPost = new Map<string, PostTag[]>()

  if (postIds.length === 0) return byPost

  const rows = await db
    .select({
      postId: postTagSchema.postId,
      id: tagSchema.id,
      name: tagSchema.name,
      slug: tagSchema.slug,
    })
    .from(postTagSchema)
    .innerJoin(tagSchema, eq(tagSchema.id, postTagSchema.tagId))
    .where(inArray(postTagSchema.postId, postIds))
    .orderBy(asc(tagSchema.name))

  for (const { postId, ...tag } of rows) {
    byPost.set(postId, [...(byPost.get(postId) ?? []), tag])
  }

  return byPost
}

async function pageOf(where: SQL | undefined, order: SQL[], limit: number, offset: number) {
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(postSchema)
      .where(where)
      .orderBy(...order)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(postSchema).where(where),
  ])

  const tags = await tagsByPostIds(rows.map((row) => row.id))

  return {
    items: rows.map((row) => ({ ...row, tags: tags.get(row.id) ?? [] })),
    total: totals[0]?.total ?? 0,
  }
}

async function loadDetail(post: PostRow): Promise<PostDetail> {
  const [covers, tags, sections, blocks, references] = await Promise.all([
    post.coverMediaId
      ? db.select(mediaColumns).from(mediaSchema).where(eq(mediaSchema.id, post.coverMediaId))
      : [],
    tagsByPostIds([post.id]),
    db
      .select()
      .from(sectionSchema)
      .where(eq(sectionSchema.postId, post.id))
      .orderBy(asc(sectionSchema.position)),
    db
      .select({
        id: blockSchema.id,
        sectionId: blockSchema.sectionId,
        type: blockSchema.type,
        groupId: blockSchema.groupId,
        content: blockSchema.content,
        caption: blockSchema.caption,
        meta: blockSchema.meta,
        mediaId: mediaSchema.id,
        mediaKey: mediaSchema.key,
        mediaAlt: mediaSchema.alt,
        mediaWidth: mediaSchema.width,
        mediaHeight: mediaSchema.height,
      })
      .from(blockSchema)
      .innerJoin(sectionSchema, eq(sectionSchema.id, blockSchema.sectionId))
      .leftJoin(mediaSchema, eq(mediaSchema.id, blockSchema.mediaId))
      .where(eq(sectionSchema.postId, post.id))
      .orderBy(asc(blockSchema.position)),
    db
      .select({
        id: postReferenceSchema.id,
        title: postReferenceSchema.title,
        author: postReferenceSchema.author,
        note: postReferenceSchema.note,
        url: postReferenceSchema.url,
      })
      .from(postReferenceSchema)
      .where(eq(postReferenceSchema.postId, post.id))
      .orderBy(asc(postReferenceSchema.position)),
  ])

  return {
    ...post,
    tags: tags.get(post.id) ?? [],
    cover: covers[0] ?? null,
    sections: sections.map((section) => ({
      id: section.id,
      label: section.label,
      title: section.title,
      blocks: blocks
        .filter((block) => block.sectionId === section.id)
        .map(({ sectionId, mediaId, mediaKey, mediaAlt, mediaWidth, mediaHeight, ...block }) => ({
          ...block,
          media:
            mediaId && mediaKey
              ? {
                  id: mediaId,
                  key: mediaKey,
                  alt: mediaAlt,
                  width: mediaWidth,
                  height: mediaHeight,
                }
              : null,
        })),
    })),
    references,
  }
}

const publishedOrder = [desc(postSchema.publishedAt), desc(postSchema.id)]

export const postsRepository = {
  async listPublished({ q, tag, limit, offset }: ListFilter) {
    const conditions: (SQL | undefined)[] = [eq(postSchema.status, 'published')]

    if (q) {
      const pattern = `%${escapeLike(q)}%`

      conditions.push(
        or(
          ilike(postSchema.title, pattern),
          ilike(postSchema.summary, pattern),
          sql`exists (select 1 from ${postTagSchema} inner join ${tagSchema} on ${tagSchema.id} = ${postTagSchema.tagId} where ${postTagSchema.postId} = ${postSchema.id} and ${tagSchema.name} ilike ${pattern})`,
        ),
      )
    }

    if (tag) {
      conditions.push(
        sql`exists (select 1 from ${postTagSchema} inner join ${tagSchema} on ${tagSchema.id} = ${postTagSchema.tagId} where ${postTagSchema.postId} = ${postSchema.id} and ${tagSchema.slug} = ${tag})`,
      )
    }

    return pageOf(and(...conditions), publishedOrder, limit, offset)
  },

  async listAll({ status, q, limit, offset }: AdminFilter) {
    return pageOf(
      and(
        status ? eq(postSchema.status, status) : undefined,
        q ? ilike(postSchema.title, `%${escapeLike(q)}%`) : undefined,
      ),
      [desc(postSchema.updatedAt)],
      limit,
      offset,
    )
  },

  async findPublishedBySlug(slug: string): Promise<PublicPostDetail | undefined> {
    const [post] = await db
      .select()
      .from(postSchema)
      .where(and(eq(postSchema.slug, slug), eq(postSchema.status, 'published')))
      .limit(1)

    if (!post?.publishedAt) return undefined

    const [detail, numbers] = await Promise.all([
      loadDetail(post),
      db
        .select({
          total: count(),
          number:
            sql<number>`count(*) filter (where ${gte(postSchema.publishedAt, post.publishedAt)})`.mapWith(
              Number,
            ),
        })
        .from(postSchema)
        .where(eq(postSchema.status, 'published')),
    ])

    return { ...detail, number: numbers[0]?.number ?? 1, total: numbers[0]?.total ?? 1 }
  },

  async findById(id: string) {
    const post = await postsRepository.findRowById(id)

    return post ? loadDetail(post) : undefined
  },

  async findPublishedItemById(id: string) {
    const { items } = await pageOf(
      and(eq(postSchema.id, id), eq(postSchema.status, 'published')),
      [desc(postSchema.publishedAt)],
      1,
      0,
    )

    return items[0]
  },

  async findRowById(id: string) {
    const [post] = await db.select().from(postSchema).where(eq(postSchema.id, id)).limit(1)

    return post
  },

  async create(data: NewPost) {
    const [post] = await db.insert(postSchema).values(data).returning()

    return post
  },

  async update(id: string, changes: PostChanges) {
    const [post] = await db.update(postSchema).set(changes).where(eq(postSchema.id, id)).returning()

    return post
  },

  async delete(id: string) {
    const [post] = await db.delete(postSchema).where(eq(postSchema.id, id)).returning()

    return post
  },

  async publish(id: string) {
    const [post] = await db
      .update(postSchema)
      .set({ status: 'published', publishedAt: sql`coalesce(${postSchema.publishedAt}, now())` })
      .where(eq(postSchema.id, id))
      .returning()

    return post
  },

  async unpublish(id: string) {
    const [post] = await db
      .update(postSchema)
      .set({ status: 'draft' })
      .where(eq(postSchema.id, id))
      .returning()

    return post
  },

  async countBlocks(postId: string) {
    const rows = await db
      .select({ total: count() })
      .from(blockSchema)
      .innerJoin(sectionSchema, eq(sectionSchema.id, blockSchema.sectionId))
      .where(eq(sectionSchema.postId, postId))

    return rows[0]?.total ?? 0
  },

  async findMissingTagIds(ids: string[]) {
    if (ids.length === 0) return []

    const found = await db
      .select({ id: tagSchema.id })
      .from(tagSchema)
      .where(inArray(tagSchema.id, ids))

    const known = new Set(found.map((row) => row.id))

    return ids.filter((id) => !known.has(id))
  },

  async findMissingMediaIds(ids: string[]) {
    if (ids.length === 0) return []

    const found = await db
      .select({ id: mediaSchema.id })
      .from(mediaSchema)
      .where(and(inArray(mediaSchema.id, ids), eq(mediaSchema.status, 'ready')))

    const known = new Set(found.map((row) => row.id))

    return ids.filter((id) => !known.has(id))
  },

  async replaceTags(postId: string, tagIds: string[]) {
    const clear = db.delete(postTagSchema).where(eq(postTagSchema.postId, postId))

    if (tagIds.length === 0) {
      await clear

      return
    }

    await db.batch([
      clear,
      db.insert(postTagSchema).values(tagIds.map((tagId) => ({ postId, tagId }))),
    ])
  },

  async replaceContent(postId: string, { sections, references }: ContentInput) {
    const sectionRows = sections.map((section, position) => ({
      id: randomUUID(),
      postId,
      label: section.label,
      title: section.title,
      position,
    }))

    const blockRows = sections.flatMap((section, index) =>
      section.blocks.map((block, position) => ({
        ...block,
        sectionId: sectionRows[index]?.id ?? '',
        position,
      })),
    )

    const referenceRows = references.map((reference, position) => ({
      ...reference,
      postId,
      position,
    }))

    await db.batch([
      db.delete(sectionSchema).where(eq(sectionSchema.postId, postId)),
      db.delete(postReferenceSchema).where(eq(postReferenceSchema.postId, postId)),
      db.update(postSchema).set({ updatedAt: new Date() }).where(eq(postSchema.id, postId)),
      ...(sectionRows.length > 0 ? [db.insert(sectionSchema).values(sectionRows)] : []),
      ...(blockRows.length > 0 ? [db.insert(blockSchema).values(blockRows)] : []),
      ...(referenceRows.length > 0 ? [db.insert(postReferenceSchema).values(referenceRows)] : []),
    ])
  },
}
