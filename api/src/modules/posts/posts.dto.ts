import { z } from 'zod'

const MAX_SECTIONS = 30

const MAX_BLOCKS_PER_SECTION = 100

const MAX_REFERENCES = 30

const MAX_TAGS_PER_POST = 20

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes')
  .max(120)

const title = z.string().trim().min(1).max(160)

const summary = z.string().trim().min(1).max(300)

const date = z.iso.date()

const coverCaption = z.string().trim().min(1).max(120)

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullish()

const isValidRange = (body: { studiedFrom?: string | null; studiedTo?: string | null }) =>
  !body.studiedFrom || !body.studiedTo || body.studiedTo >= body.studiedFrom

const RANGE_ERROR = 'studiedTo must be on or after studiedFrom'

export const createPostBody = z
  .object({
    title,
    slug: slug.optional(),
    summary: summary.optional(),
    studiedFrom: date.optional(),
    studiedTo: date.optional(),
    coverMediaId: z.uuid().optional(),
    coverCaption: coverCaption.optional(),
  })
  .refine(isValidRange, { path: ['studiedTo'], message: RANGE_ERROR })

export const updatePostBody = z
  .object({
    title,
    slug,
    summary: summary.nullable(),
    studiedFrom: date.nullable(),
    studiedTo: date.nullable(),
    coverMediaId: z.uuid().nullable(),
    coverCaption: coverCaption.nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Send at least one field to update')
  .refine(isValidRange, { path: ['studiedTo'], message: RANGE_ERROR })

const groupId = z.number().int().min(0).max(1000).nullish()

const textBlock = z.object({
  type: z.literal('text'),
  groupId,
  content: z.string().trim().min(1).max(20000),
})

const imageBlock = z.object({
  type: z.literal('image'),
  groupId,
  mediaId: z.uuid(),
  caption: optionalText(200),
})

const codeBlock = z.object({
  type: z.literal('code'),
  groupId,
  content: z.string().min(1).max(20000),
  language: optionalText(30),
  filename: optionalText(100),
})

const calloutBlock = z.object({
  type: z.literal('callout'),
  groupId,
  content: z.string().trim().min(1).max(2000),
  label: optionalText(30),
})

const quoteBlock = z.object({
  type: z.literal('quote'),
  groupId,
  content: z.string().trim().min(1).max(500),
})

const cardsBlock = z.object({
  type: z.literal('cards'),
  groupId,
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(100),
        description: z.string().trim().min(1).max(300),
      }),
    )
    .min(1)
    .max(12),
})

const blockInput = z.discriminatedUnion('type', [
  textBlock,
  imageBlock,
  codeBlock,
  calloutBlock,
  cardsBlock,
  quoteBlock,
])

const sectionInput = z.object({
  label: optionalText(60),
  title: optionalText(160),
  blocks: z.array(blockInput).max(MAX_BLOCKS_PER_SECTION),
})

const referenceInput = z.object({
  title: z.string().trim().min(1).max(200),
  author: optionalText(120),
  note: optionalText(120),
  url: z
    .string()
    .trim()
    .pipe(z.url({ protocol: /^https?$/ }).max(2048)),
})

export const contentBody = z.object({
  sections: z.array(sectionInput).max(MAX_SECTIONS),
  references: z.array(referenceInput).max(MAX_REFERENCES),
})

export const tagsBody = z.object({
  tagIds: z
    .array(z.uuid())
    .max(MAX_TAGS_PER_POST)
    .refine((ids) => new Set(ids).size === ids.length, 'tagIds must not repeat'),
})

export const postParams = z.object({ id: z.uuid() })

export const slugParams = z.object({ slug: slug })

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}

export const publicListQuery = z.object({
  ...pagination,
  q: z.string().trim().min(1).max(100).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
})

export const adminListQuery = z.object({
  ...pagination,
  status: z.enum(['draft', 'published']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
})

const tagResponse = z.object({ id: z.uuid(), name: z.string(), slug: z.string() })

const listItemFields = {
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  publishedAt: z.date().nullable(),
  studiedFrom: z.string().nullable(),
  studiedTo: z.string().nullable(),
  tags: z.array(tagResponse),
}

export const publicListItemResponse = z.object(listItemFields)

export const adminListItemResponse = z.object({
  ...listItemFields,
  status: z.enum(['draft', 'published']),
  updatedAt: z.date(),
})

const pageFields = {
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
}

export const publicListResponse = z.object({
  items: z.array(publicListItemResponse),
  ...pageFields,
})

export const adminListResponse = z.object({
  items: z.array(adminListItemResponse.extend({ views: z.number().int() })),
  counts: z.object({
    all: z.number().int(),
    published: z.number().int(),
    draft: z.number().int(),
  }),
  ...pageFields,
})

const imageResponse = z.object({
  id: z.uuid(),
  url: z.string().nullable(),
  alt: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
})

const blockResponse = z.object({
  id: z.uuid(),
  type: z.enum(['text', 'image', 'code', 'callout', 'cards', 'quote']),
  groupId: z.number().int().nullable(),
  content: z.string().nullable(),
  caption: z.string().nullable(),
  meta: z
    .object({
      language: z.string().optional(),
      filename: z.string().optional(),
      label: z.string().optional(),
      items: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
    })
    .nullable(),
  image: imageResponse.nullable(),
})

const sectionResponse = z.object({
  id: z.uuid(),
  label: z.string().nullable(),
  title: z.string().nullable(),
  blocks: z.array(blockResponse),
})

const referenceResponse = z.object({
  id: z.uuid(),
  title: z.string(),
  author: z.string().nullable(),
  note: z.string().nullable(),
  url: z.string(),
})

const detailFields = {
  ...listItemFields,
  cover: imageResponse.extend({ caption: z.string().nullable() }).nullable(),
  sections: z.array(sectionResponse),
  references: z.array(referenceResponse),
}

export const publicPostResponse = z.object({
  ...detailFields,
  number: z.number().int(),
  total: z.number().int(),
})

export const adminPostResponse = z.object({
  ...detailFields,
  coverMediaId: z.uuid().nullable(),
  status: z.enum(['draft', 'published']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type CreatePostBody = z.infer<typeof createPostBody>

export type UpdatePostBody = z.infer<typeof updatePostBody>

export type ContentBody = z.infer<typeof contentBody>

export type PublicListQuery = z.infer<typeof publicListQuery>

export type AdminListQuery = z.infer<typeof adminListQuery>
