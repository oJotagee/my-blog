import type { FastifyReply, FastifyRequest } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { env } from '../../config/env'
import { authRateLimit } from '../../plugins/security'
import { accessTokenResponse, loginBody } from './auth.dto'
import { authService } from './auth.service'

const REFRESH_COOKIE = 'refreshToken'

const ADMIN_SUBJECT = 'admin'

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/auth',
} as const

function readUserAgent(request: FastifyRequest) {
  const value = request.headers['x-client-user-agent']

  return typeof value === 'string' ? value.slice(0, 255) : null
}

function setRefreshCookie(reply: FastifyReply, token: string, expires: Date) {
  reply.setCookie(REFRESH_COOKIE, token, { ...refreshCookieOptions, expires })
}

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/login',
    {
      config: { rateLimit: authRateLimit.login },
      schema: {
        tags: ['Auth'],
        summary: 'Authenticate the admin with email and password',
        description:
          'Returns the access token and sets the refresh token in an httpOnly cookie. The web sends the browser user agent in x-client-user-agent.',
        body: loginBody,
        response: { 200: accessTokenResponse },
      },
    },
    async (request, reply) => {
      const session = await authService.login(request.body, readUserAgent(request))

      setRefreshCookie(reply, session.refreshToken, session.refreshTokenExpiresAt)

      const accessToken = app.jwt.sign({ sub: ADMIN_SUBJECT, sid: session.sessionId })

      return { accessToken }
    },
  )

  app.post(
    '/refresh',
    {
      config: { rateLimit: authRateLimit.refresh },
      schema: {
        tags: ['Auth'],
        summary: 'Get a new access token',
        description: 'Uses the refresh token cookie. The cookie is rotated on every call.',
        response: { 200: accessTokenResponse },
      },
    },
    async (request, reply) => {
      try {
        const session = await authService.refresh(request.cookies[REFRESH_COOKIE])

        setRefreshCookie(reply, session.refreshToken, session.refreshTokenExpiresAt)

        const accessToken = app.jwt.sign({ sub: ADMIN_SUBJECT, sid: session.sessionId })

        return { accessToken }
      } catch (error) {
        reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions)

        throw error
      }
    },
  )

  app.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'End the current session',
        description: 'Revokes the session from the refresh token cookie and clears it.',
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await authService.logout(request.cookies[REFRESH_COOKIE])

      reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions)

      return reply.status(204).send(null)
    },
  )
}
