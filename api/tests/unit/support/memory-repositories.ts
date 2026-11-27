import { spyOn } from 'bun:test'
import { randomUUID } from 'node:crypto'

import type { BlockMeta } from '../../../src/db/schema'
import { analyticsRepository } from '../../../src/modules/analytics/analytics.repository'
import { authRepository } from '../../../src/modules/auth/auth.repository'
import {
  type BlockType,
  type PostDetail,
  type PostRow,
  postsRepository,
} from '../../../src/modules/posts/posts.repository'
import { siteRepository } from '../../../src/modules/site/site.repository'
import { tagsRepository } from '../../../src/modules/tags/tags.repository'
import { buildPost } from './builders'

export type Session = {
  id: string
  refreshTokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  userAgent: string | null
}

export type Tag = { id: string; name: string; slug: string; createdAt: Date; updatedAt: Date }

export type Section = {
  id: string
  postId: string
  label: string | null
  title: string | null
  position: number
}

export type Block = {
  id: string
  sectionId: string
  position: number
  type: BlockType
  groupId: number | null
  content: string | null
  mediaId: string | null
  caption: string | null
  meta: BlockMeta | null
}

export type Reference = {
  id: string
  postId: string
  title: string
  author: string | null
  note: string | null
  url: string
  position: number
}

export type Media = {
  id: string
  key: string
  alt: string | null
  width: number | null
  height: number | null
  status: 'pending' | 'ready' | 'failed'
}

function uniqueViolation(constraint: string) {
  return new Error('duplicate key', { cause: { code: '23505', constraint } })
}

export function useInMemoryRepositories() {
  const store = {
    sessions: [] as Session[],
    tags: [] as Tag[],
    posts: [] as PostRow[],
    postTags: [] as { postId: string; tagId: string }[],
    sections: [] as Section[],
    blocks: [] as Block[],
    references: [] as Reference[],
    media: [] as Media[],
    views: [] as { postId: string; date: string; views: number }[],
    site: undefined as Record<string, unknown> | undefined,
  }

  spyOn(authRepository, 'createSession').mockImplementation(async (data) => {
    store.sessions.push({ revokedAt: null, userAgent: null, ...data })
  })

  spyOn(authRepository, 'findSessionById').mockImplementation(
    async (id) => store.sessions.find((session) => session.id === id) as never,
  )

  spyOn(authRepository, 'rotateSessionToken').mockImplementation(async (id, hash, expiresAt) => {
    const session = store.sessions.find((item) => item.id === id && !item.revokedAt)

    if (session) Object.assign(session, { refreshTokenHash: hash, expiresAt })
  })

  spyOn(authRepository, 'revokeSession').mockImplementation(async (id) => {
    const session = store.sessions.find((item) => item.id === id && !item.revokedAt)

    if (session) session.revokedAt = new Date()
  })

  function postsOfTag(tagId: string, publishedOnly: boolean) {
    return store.postTags
      .filter((link) => link.tagId === tagId)
      .map((link) => store.posts.find((post) => post.id === link.postId))
      .filter((post) => post && (!publishedOnly || post.status === 'published')) as PostRow[]
  }

  function assertUniqueTag(data: { name: string; slug: string }, ignoreId?: string) {
    const others = store.tags.filter((tag) => tag.id !== ignoreId)

    if (others.some((tag) => tag.name === data.name)) throw uniqueViolation('tags_name_unique')

    if (others.some((tag) => tag.slug === data.slug)) throw uniqueViolation('tags_slug_unique')
  }

  spyOn(tagsRepository, 'listWithCounts').mockImplementation(async (publishedOnly) =>
    store.tags
      .map(({ id, name, slug }) => ({
        id,
        name,
        slug,
        postCount: postsOfTag(id, publishedOnly).length,
      }))
      .filter((tag) => !publishedOnly || tag.postCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
  )

  spyOn(tagsRepository, 'listSkills').mockImplementation(async () =>
    store.tags
      .map(({ id, name, slug }) => {
        const posts = postsOfTag(id, true)

        const starts = posts.flatMap((post) => (post.studiedFrom ? [post.studiedFrom] : [])).sort()

        const ends = posts
          .flatMap((post) => {
            const end = post.studiedTo ?? post.studiedFrom

            return end ? [end] : []
          })
          .sort()

        return {
          id,
          name,
          slug,
          postCount: posts.length,
          firstStudiedAt: starts[0] ?? null,
          lastStudiedAt: ends.at(-1) ?? null,
        }
      })
      .filter((tag) => tag.postCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
  )

  spyOn(tagsRepository, 'create').mockImplementation(async (data) => {
    assertUniqueTag(data)

    const now = new Date()

    const tag = { id: randomUUID(), ...data, createdAt: now, updatedAt: now }

    store.tags.push(tag)

    return tag
  })

  spyOn(tagsRepository, 'update').mockImplementation(async (id, data) => {
    const tag = store.tags.find((item) => item.id === id)

    if (!tag) return undefined

    assertUniqueTag(data, id)

    Object.assign(tag, data, { updatedAt: new Date() })

    return tag
  })

  spyOn(tagsRepository, 'delete').mockImplementation(async (id) => {
    const index = store.tags.findIndex((item) => item.id === id)

    if (index === -1) return undefined

    store.postTags = store.postTags.filter((link) => link.tagId !== id)

    return store.tags.splice(index, 1)[0]
  })

  function tagsOf(postId: string) {
    return store.postTags
      .filter((link) => link.postId === postId)
      .flatMap((link) => store.tags.filter((tag) => tag.id === link.tagId))
      .map(({ id, name, slug }) => ({ id, name, slug }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  function withTags(post: PostRow) {
    return { ...post, tags: tagsOf(post.id) }
  }

  function mediaOf(id: string | null) {
    const media = store.media.find((item) => item.id === id)

    return media
      ? { id: media.id, key: media.key, alt: media.alt, width: media.width, height: media.height }
      : null
  }

  function assemble(post: PostRow): PostDetail {
    return {
      ...withTags(post),
      cover: mediaOf(post.coverMediaId),
      sections: store.sections
        .filter((section) => section.postId === post.id)
        .sort((a, b) => a.position - b.position)
        .map(({ id, label, title }) => ({
          id,
          label,
          title,
          blocks: store.blocks
            .filter((block) => block.sectionId === id)
            .sort((a, b) => a.position - b.position)
            .map(({ sectionId, position, mediaId, ...block }) => ({
              ...block,
              media: mediaOf(mediaId),
            })),
        })),
      references: store.references
        .filter((reference) => reference.postId === post.id)
        .sort((a, b) => a.position - b.position)
        .map(({ postId, position, ...reference }) => reference),
    }
  }

  function assertUniqueSlug(slug: string | undefined, ignoreId?: string) {
    if (slug && store.posts.some((post) => post.slug === slug && post.id !== ignoreId)) {
      throw uniqueViolation('posts_slug_unique')
    }
  }

  function paginate(posts: PostRow[], limit: number, offset: number) {
    return { items: posts.slice(offset, offset + limit).map(withTags), total: posts.length }
  }

  function byPublishedDesc(a: PostRow, b: PostRow) {
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
  }

  spyOn(postsRepository, 'listPublished').mockImplementation(async ({ q, tag, limit, offset }) => {
    const needle = q?.toLowerCase()

    const posts = store.posts
      .filter((post) => post.status === 'published')
      .filter((post) => {
        if (!needle) return true

        return [post.title, post.summary ?? '', ...tagsOf(post.id).map((item) => item.name)].some(
          (text) => text.toLowerCase().includes(needle),
        )
      })
      .filter((post) => !tag || tagsOf(post.id).some((item) => item.slug === tag))
      .sort(byPublishedDesc)

    return paginate(posts, limit, offset)
  })

  spyOn(analyticsRepository, 'countPostsByStatus').mockImplementation(async () =>
    (['published', 'draft'] as const).map((status) => ({
      status,
      total: store.posts.filter((post) => post.status === status).length,
    })),
  )

  spyOn(analyticsRepository, 'viewsByPostIds').mockImplementation(async (ids) => {
    const totals = new Map<string, number>()

    for (const row of store.views.filter((item) => ids.includes(item.postId))) {
      totals.set(row.postId, (totals.get(row.postId) ?? 0) + row.views)
    }

    return totals
  })

  spyOn(postsRepository, 'listAll').mockImplementation(async ({ status, q, limit, offset }) =>
    paginate(
      store.posts
        .filter((post) => !status || post.status === status)
        .filter((post) => !q || post.title.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      limit,
      offset,
    ),
  )

  spyOn(postsRepository, 'findPublishedBySlug').mockImplementation(async (slug) => {
    const post = store.posts.find((item) => item.slug === slug && item.status === 'published')

    if (!post?.publishedAt) return undefined

    const { publishedAt } = post

    const published = store.posts.filter((item) => item.status === 'published')

    return {
      ...assemble(post),
      number: published.filter((item) => item.publishedAt && item.publishedAt >= publishedAt)
        .length,
      total: published.length,
    }
  })

  spyOn(postsRepository, 'findPublishedItemById').mockImplementation(async (id) => {
    const post = store.posts.find((item) => item.id === id && item.status === 'published')

    return post && withTags(post)
  })

  spyOn(siteRepository, 'get').mockImplementation(async () => store.site)

  spyOn(siteRepository, 'save').mockImplementation(async (home) => {
    store.site = home
  })

  spyOn(postsRepository, 'findRowById').mockImplementation(async (id) =>
    store.posts.find((post) => post.id === id),
  )

  spyOn(postsRepository, 'findById').mockImplementation(async (id) => {
    const post = store.posts.find((item) => item.id === id)

    return post ? assemble(post) : undefined
  })

  spyOn(postsRepository, 'create').mockImplementation(async (data) => {
    assertUniqueSlug(data.slug)

    const post = buildPost({
      summary: null,
      studiedFrom: null,
      studiedTo: null,
      coverMediaId: null,
      coverCaption: null,
      ...data,
      status: 'draft',
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    store.posts.push(post)

    return post
  })

  spyOn(postsRepository, 'update').mockImplementation(async (id, changes) => {
    const post = store.posts.find((item) => item.id === id)

    if (!post) return undefined

    assertUniqueSlug(changes.slug, id)

    Object.assign(post, changes, { updatedAt: new Date() })

    return post
  })

  spyOn(postsRepository, 'delete').mockImplementation(async (id) => {
    const index = store.posts.findIndex((item) => item.id === id)

    if (index === -1) return undefined

    const sectionIds = store.sections.filter((s) => s.postId === id).map((s) => s.id)

    store.blocks = store.blocks.filter((block) => !sectionIds.includes(block.sectionId))
    store.sections = store.sections.filter((section) => section.postId !== id)
    store.references = store.references.filter((reference) => reference.postId !== id)
    store.postTags = store.postTags.filter((link) => link.postId !== id)

    return store.posts.splice(index, 1)[0]
  })

  spyOn(postsRepository, 'publish').mockImplementation(async (id) => {
    const post = store.posts.find((item) => item.id === id)

    if (!post) return undefined

    post.status = 'published'

    post.publishedAt ??= new Date()

    return post
  })

  spyOn(postsRepository, 'unpublish').mockImplementation(async (id) => {
    const post = store.posts.find((item) => item.id === id)

    if (post) post.status = 'draft'

    return post
  })

  spyOn(postsRepository, 'countBlocks').mockImplementation(async (postId) => {
    const sectionIds = store.sections.filter((s) => s.postId === postId).map((s) => s.id)

    return store.blocks.filter((block) => sectionIds.includes(block.sectionId)).length
  })

  spyOn(postsRepository, 'findMissingTagIds').mockImplementation(async (ids) =>
    ids.filter((id) => !store.tags.some((tag) => tag.id === id)),
  )

  spyOn(postsRepository, 'findMissingMediaIds').mockImplementation(async (ids) =>
    ids.filter((id) => !store.media.some((media) => media.id === id && media.status === 'ready')),
  )

  spyOn(postsRepository, 'replaceTags').mockImplementation(async (postId, tagIds) => {
    store.postTags = [
      ...store.postTags.filter((link) => link.postId !== postId),
      ...tagIds.map((tagId) => ({ postId, tagId })),
    ]
  })

  spyOn(postsRepository, 'replaceContent').mockImplementation(
    async (postId, { sections, references }) => {
      const oldSectionIds = store.sections.filter((s) => s.postId === postId).map((s) => s.id)

      store.blocks = store.blocks.filter((block) => !oldSectionIds.includes(block.sectionId))
      store.sections = store.sections.filter((section) => section.postId !== postId)
      store.references = store.references.filter((reference) => reference.postId !== postId)

      sections.forEach((section, index) => {
        const id = randomUUID()

        store.sections.push({
          id,
          postId,
          label: section.label,
          title: section.title,
          position: index,
        })

        section.blocks.forEach((block, position) => {
          store.blocks.push({ id: randomUUID(), sectionId: id, position, ...block })
        })
      })

      references.forEach((reference, position) => {
        store.references.push({ id: randomUUID(), postId, position, ...reference })
      })

      const post = store.posts.find((item) => item.id === postId)

      if (post) post.updatedAt = new Date()
    },
  )

  return store
}
