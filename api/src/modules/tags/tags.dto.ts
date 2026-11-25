import { z } from 'zod'

const name = z.string().trim().min(1).max(50)

export const tagBody = z.object({ name })

export const tagParams = z.object({ id: z.uuid() })

export const tagResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const tagWithCountResponse = tagResponse.pick({ id: true, name: true, slug: true }).extend({
  postCount: z.number().int(),
})

export const skillResponse = tagWithCountResponse.extend({
  firstStudiedAt: z.string().nullable(),
  lastStudiedAt: z.string().nullable(),
})

export type TagBody = z.infer<typeof tagBody>
