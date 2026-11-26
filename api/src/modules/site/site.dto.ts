import { z } from 'zod'

const text = (max: number) => z.string().trim().min(1).max(max).nullable()

const url = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/ }).max(2048))
  .nullable()

export const siteBody = z.object({
  heroTitle: text(160),
  heroSubtitle: text(300),
  aboutTitle: text(80),
  aboutText: text(2000),
  authorName: text(80),
  authorBio: text(500),
  city: text(80),
  githubUrl: url,
  portfolioUrl: url,
  featuredPostId: z.uuid().nullable(),
})

export const emptySite: SiteBody = {
  heroTitle: null,
  heroSubtitle: null,
  aboutTitle: null,
  aboutText: null,
  authorName: null,
  authorBio: null,
  city: null,
  githubUrl: null,
  portfolioUrl: null,
  featuredPostId: null,
}

const tagResponse = z.object({ id: z.uuid(), name: z.string(), slug: z.string() })

const featuredPostResponse = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  publishedAt: z.date().nullable(),
  studiedFrom: z.string().nullable(),
  studiedTo: z.string().nullable(),
  readingMinutes: z.number().int(),
  tags: z.array(tagResponse),
})

export const adminSiteResponse = siteBody

export const publicSiteResponse = siteBody
  .omit({ featuredPostId: true })
  .extend({ featuredPost: featuredPostResponse.nullable() })

export type SiteBody = z.infer<typeof siteBody>
