import { spyOn } from 'bun:test'
import { randomUUID } from 'node:crypto'

import { authRepository } from '../../../src/modules/auth/auth.repository'
import { tagsRepository } from '../../../src/modules/tags/tags.repository'

export type Session = {
  id: string
  refreshTokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  userAgent: string | null
}

export type Tag = { id: string; name: string; slug: string; createdAt: Date; updatedAt: Date }

export type StoredPost = {
  id: string
  status: 'draft' | 'published'
  studiedFrom: string | null
  studiedTo: string | null
}

function uniqueViolation(constraint: string) {
  return new Error('duplicate key', { cause: { code: '23505', constraint } })
}

export function useInMemoryRepositories() {
  const store = {
    sessions: [] as Session[],
    tags: [] as Tag[],
    posts: [] as StoredPost[],
    postTags: [] as { postId: string; tagId: string }[],
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
      .filter((post) => post && (!publishedOnly || post.status === 'published')) as StoredPost[]
  }

  function assertUnique(data: { name: string; slug: string }, ignoreId?: string) {
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
    assertUnique(data)

    const now = new Date()

    const tag = { id: randomUUID(), ...data, createdAt: now, updatedAt: now }

    store.tags.push(tag)

    return tag
  })

  spyOn(tagsRepository, 'update').mockImplementation(async (id, data) => {
    const tag = store.tags.find((item) => item.id === id)

    if (!tag) return undefined

    assertUnique(data, id)

    Object.assign(tag, data, { updatedAt: new Date() })

    return tag
  })

  spyOn(tagsRepository, 'delete').mockImplementation(async (id) => {
    const index = store.tags.findIndex((item) => item.id === id)

    if (index === -1) return undefined

    store.postTags = store.postTags.filter((link) => link.tagId !== id)

    return store.tags.splice(index, 1)[0]
  })

  return store
}
