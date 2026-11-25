import { z } from 'zod'

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(100)),
  password: z.string().min(1).max(72),
})

export const accessTokenResponse = z.object({
  accessToken: z.string(),
})

export type LoginBody = z.infer<typeof loginBody>
