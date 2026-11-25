import { randomUUID } from 'node:crypto'

import type { PostRow } from '../../../src/modules/posts/posts.repository'

const createdAt = new Date('2026-01-01T00:00:00.000Z')

export function buildPost(overrides: Partial<PostRow> = {}): PostRow {
  const id = overrides.id ?? randomUUID()

  return {
    id,
    slug: `post-${id.slice(0, 8)}`,
    title: 'Post title',
    summary: null,
    status: 'published',
    publishedAt: new Date('2026-03-01T00:00:00.000Z'),
    studiedFrom: null,
    studiedTo: null,
    coverMediaId: null,
    coverCaption: null,
    readingMinutes: 1,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}
