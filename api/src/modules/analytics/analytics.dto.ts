import { z } from 'zod'

export const viewParams = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
})

export const popularQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

const topPostResponse = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  views: z.number().int(),
})

export const popularResponse = z.array(topPostResponse)

export const dashboardResponse = z.object({
  posts: z.object({ published: z.number().int(), drafts: z.number().int() }),
  tags: z.number().int(),
  views: z.object({
    total: z.number().int(),
    last7Days: z.number().int(),
    last30Days: z.number().int(),
  }),
  daily: z.array(z.object({ date: z.string(), views: z.number().int() })),
  topPosts: popularResponse,
})
