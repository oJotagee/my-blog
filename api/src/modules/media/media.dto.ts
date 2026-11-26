import { z } from 'zod'

import { env } from '../../config/env'

export const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const presignMediaBody = z.object({
  contentType: z.enum(MEDIA_MIME_TYPES),
  size: z.number().int().positive().max(env.MEDIA_MAX_BYTES),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  alt: z.string().trim().min(1).max(200).optional(),
})

export const mediaParams = z.object({ id: z.uuid() })

export const presignMediaResponse = z.object({
  mediaId: z.uuid(),
  uploadUrl: z.url(),
  expiresIn: z.number().int(),
})

export const mediaResponse = z.object({
  id: z.uuid(),
  status: z.enum(['pending', 'ready', 'failed']),
  mimeType: z.string(),
  size: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string().nullable(),
  url: z.string().nullable(),
})

export type PresignMediaBody = z.infer<typeof presignMediaBody>
