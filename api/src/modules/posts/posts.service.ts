import { contentCache } from '../../shared/content-cache'
import { getUniqueViolation } from '../../shared/db-errors'
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors'
import { mediaUrl } from '../../shared/media-url'
import { slugify } from '../../shared/slug'
import { analyticsRepository } from '../analytics/analytics.repository'
import type {
  AdminListQuery,
  ContentBody,
  CreatePostBody,
  PublicListQuery,
  UpdatePostBody,
} from './posts.dto'
import {
  type ContentInput,
  type MediaInfo,
  type PostDetail,
  type PostListItem,
  postsRepository,
} from './posts.repository'

const POST_NOT_FOUND = 'Post not found'

function toConflictError(error: unknown) {
  if (getUniqueViolation(error) === 'posts_slug_unique') {
    return new ConflictError('Slug already in use')
  }

  return error
}

function toImage(media: MediaInfo | null) {
  if (!media) return null

  return {
    id: media.id,
    url: mediaUrl(media.key),
    alt: media.alt,
    width: media.width,
    height: media.height,
  }
}

function toPage<T>(items: T[], total: number, page: number, limit: number) {
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) }
}

function toListItem({
  id,
  slug,
  title,
  summary,
  publishedAt,
  studiedFrom,
  studiedTo,
  tags,
}: PostListItem) {
  return { id, slug, title, summary, publishedAt, studiedFrom, studiedTo, tags }
}

function toDetail(post: PostDetail) {
  const cover = toImage(post.cover)

  return {
    ...toListItem(post),
    cover: cover ? { ...cover, caption: post.coverCaption } : null,
    sections: post.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map(({ media, ...block }) => ({ ...block, image: toImage(media) })),
    })),
    references: post.references,
  }
}

function toContentInput(body: ContentBody): ContentInput {
  return {
    references: body.references.map((reference) => ({
      ...reference,
      author: reference.author ?? null,
      note: reference.note ?? null,
    })),
    sections: body.sections.map((section) => ({
      label: section.label ?? null,
      title: section.title ?? null,
      blocks: section.blocks.map((block) => ({
        type: block.type,
        groupId: block.groupId ?? null,
        content: block.type === 'image' || block.type === 'cards' ? null : block.content,
        mediaId: block.type === 'image' ? block.mediaId : null,
        caption: block.type === 'image' ? (block.caption ?? null) : null,
        meta: toMeta(block),
      })),
    })),
  }
}

function toMeta(block: ContentBody['sections'][number]['blocks'][number]) {
  if (block.type === 'code') {
    return { language: block.language ?? undefined, filename: block.filename ?? undefined }
  }

  if (block.type === 'callout') return { label: block.label ?? undefined }

  if (block.type === 'cards') return { items: block.items }

  return null
}

async function assertMediaExists(ids: (string | null | undefined)[]) {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))]

  if ((await postsRepository.findMissingMediaIds(wanted)).length > 0) {
    throw new BadRequestError('Unknown or unfinished media')
  }
}

async function getAdminPost(id: string) {
  const post = await postsRepository.findById(id)

  if (!post) throw new NotFoundError(POST_NOT_FOUND)

  return {
    ...toDetail(post),
    coverMediaId: post.coverMediaId,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}

async function assertExists(id: string) {
  if (!(await postsRepository.findRowById(id))) throw new NotFoundError(POST_NOT_FOUND)
}

export const postsService = {
  async listPublic({ page, limit, q, tag }: PublicListQuery) {
    const load = async () => {
      const { items, total } = await postsRepository.listPublished({
        q,
        tag,
        limit,
        offset: (page - 1) * limit,
      })

      return toPage(items.map(toListItem), total, page, limit)
    }

    // A busca é texto livre: guardar cada termo encheria o Redis sem repetir acessos.
    if (q) return load()

    return contentCache.getOrLoad(`posts:${JSON.stringify([page, limit, tag ?? null])}`, load)
  },

  async getPublic(slug: string) {
    return contentCache.getOrLoad(`post:${slug}`, async () => {
      const post = await postsRepository.findPublishedBySlug(slug)

      if (!post) throw new NotFoundError(POST_NOT_FOUND)

      return { ...toDetail(post), number: post.number, total: post.total }
    })
  },

  async listAdmin({ page, limit, status, q }: AdminListQuery) {
    const [{ items, total }, byStatus] = await Promise.all([
      postsRepository.listAll({ status, q, limit, offset: (page - 1) * limit }),
      analyticsRepository.countPostsByStatus(),
    ])

    const views = await analyticsRepository.viewsByPostIds(items.map((post) => post.id))

    const countOf = (wanted: string) => byStatus.find((row) => row.status === wanted)?.total ?? 0

    const published = countOf('published')

    const draft = countOf('draft')

    return {
      ...toPage(
        items.map((post) => ({
          ...toListItem(post),
          status: post.status,
          updatedAt: post.updatedAt,
          views: views.get(post.id) ?? 0,
        })),
        total,
        page,
        limit,
      ),
      counts: { all: published + draft, published, draft },
    }
  },

  getAdmin: getAdminPost,

  async create(body: CreatePostBody) {
    const slug = body.slug ?? slugify(body.title, 120)

    if (!slug) throw new BadRequestError('Title must contain letters or numbers')

    await assertMediaExists([body.coverMediaId])

    try {
      const post = await postsRepository.create({ ...body, slug })

      if (!post) throw new Error('Failed to create post')

      return await getAdminPost(post.id)
    } catch (error) {
      throw toConflictError(error)
    }
  },

  async update(id: string, changes: UpdatePostBody) {
    await assertMediaExists([changes.coverMediaId])

    try {
      const post = await postsRepository.update(id, changes)

      if (!post) throw new NotFoundError(POST_NOT_FOUND)
    } catch (error) {
      throw toConflictError(error)
    }

    return getAdminPost(id)
  },

  async delete(id: string) {
    if (!(await postsRepository.delete(id))) throw new NotFoundError(POST_NOT_FOUND)
  },

  async replaceContent(id: string, body: ContentBody) {
    await assertExists(id)

    await assertMediaExists(
      body.sections.flatMap((section) =>
        section.blocks.map((block) => (block.type === 'image' ? block.mediaId : null)),
      ),
    )

    await postsRepository.replaceContent(id, toContentInput(body))

    return getAdminPost(id)
  },

  async replaceTags(id: string, tagIds: string[]) {
    await assertExists(id)

    if ((await postsRepository.findMissingTagIds(tagIds)).length > 0) {
      throw new BadRequestError('Unknown tag')
    }

    await postsRepository.replaceTags(id, tagIds)

    return getAdminPost(id)
  },

  async publish(id: string) {
    await assertExists(id)

    if ((await postsRepository.countBlocks(id)) === 0) {
      throw new BadRequestError('Add content before publishing')
    }

    await postsRepository.publish(id)

    return getAdminPost(id)
  },

  async unpublish(id: string) {
    if (!(await postsRepository.unpublish(id))) throw new NotFoundError(POST_NOT_FOUND)

    return getAdminPost(id)
  },
}
