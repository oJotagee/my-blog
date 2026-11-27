import { z } from 'zod'

const text = (max: number) => z.string().trim().min(1).max(max).nullable()

const url = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/ }).max(2048))
  .nullable()

export const siteBody = z.object({
  heroEyebrow: text(80),
  heroTitle: text(160),
  heroSubtitle: text(300),
  aboutTitle: text(80),
  aboutText: text(2000),
  authorName: text(80),
  authorBio: text(500),
  city: text(80),
  githubUrl: url,
  portfolioUrl: url,
  footerNote: text(160),
  footerYear: z.number().int().min(2000).max(2100).nullable(),
  featuredPostId: z.uuid().nullable(),
})

export const emptySite: SiteBody = {
  heroEyebrow: null,
  heroTitle: null,
  heroSubtitle: null,
  aboutTitle: null,
  aboutText: null,
  authorName: null,
  authorBio: null,
  city: null,
  githubUrl: null,
  portfolioUrl: null,
  footerNote: null,
  footerYear: null,
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
  tags: z.array(tagResponse),
})

export const adminSiteResponse = siteBody

export const publicSiteResponse = siteBody
  .omit({ featuredPostId: true })
  .extend({ featuredPost: featuredPostResponse.nullable() })

export type SiteBody = z.infer<typeof siteBody>
