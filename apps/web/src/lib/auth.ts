import { isAxiosError } from 'axios'
import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

import { api } from './api'
import { getClientUserAgentHeader } from './client-user-agent'
import { type ApiTokens, readApiTokens } from './read-api-tokens'

const REFRESH_REUSE_MS = 30_000

const globalRefreshes = globalThis as typeof globalThis & {
  blogRefreshes?: Map<string, { at: number; tokens: Promise<ApiTokens> }>
}

globalRefreshes.blogRefreshes ??= new Map()

const refreshes = globalRefreshes.blogRefreshes

// A API troca o refresh token a cada uso e revoga a sessão se um antigo voltar:
// pedidos simultâneos precisam compartilhar a mesma troca.
function refreshTokens(refreshToken: string): Promise<ApiTokens> {
  const now = Date.now()

  for (const [key, entry] of refreshes) {
    if (now - entry.at > REFRESH_REUSE_MS) refreshes.delete(key)
  }

  const cached = refreshes.get(refreshToken)

  if (cached) return cached.tokens

  const tokens = api
    .post<{ accessToken: string }>('/auth/refresh', null, {
      headers: { Cookie: `refreshToken=${refreshToken}` },
    })
    .then(readApiTokens)

  refreshes.set(refreshToken, { at: now, tokens })

  tokens.catch(() => refreshes.delete(refreshToken))

  return tokens
}

class TooManyLoginAttempts extends CredentialsSignin {
  code = 'too_many_attempts'
}

class SignInUnavailable extends CredentialsSignin {
  code = 'unavailable'
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(72),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/entrar', error: '/entrar' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const input = credentialsSchema.safeParse(credentials)

        if (!input.success) return null

        try {
          const response = await api.post<{ accessToken: string }>('/auth/login', input.data, {
            headers: await getClientUserAgentHeader(),
          })

          return { id: 'admin', email: input.data.email, ...readApiTokens(response) }
        } catch (error) {
          if (isAxiosError(error) && error.response?.status === 401) return null

          if (isAxiosError(error) && error.response?.status === 429) {
            throw new TooManyLoginAttempts()
          }

          throw new SignInUnavailable()
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken

        token.refreshToken = user.refreshToken

        token.accessTokenExpiresAt = user.accessTokenExpiresAt

        return token
      }

      if (!token.accessTokenExpiresAt || !token.refreshToken) return null

      if (Date.now() >= token.accessTokenExpiresAt) {
        try {
          Object.assign(token, await refreshTokens(token.refreshToken))
        } catch {
          return null
        }
      }

      return token
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message && message.token?.refreshToken) {
        try {
          await api.post('/auth/logout', null, {
            headers: { Cookie: `refreshToken=${message.token.refreshToken}` },
          })
        } catch {
          // Sair precisa funcionar mesmo com a API fora; a sessão expira sozinha.
        }
      }
    },
  },
})
