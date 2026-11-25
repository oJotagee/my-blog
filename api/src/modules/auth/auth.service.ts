import { randomUUID } from 'node:crypto'

import { env } from '../../config/env'
import { UnauthorizedError } from '../../shared/errors'
import { verifyPassword } from '../../shared/password'
import { createRefreshToken, parseRefreshToken, secretMatchesHash } from '../../shared/token'
import type { LoginBody } from './auth.dto'
import { authRepository } from './auth.repository'

function refreshTokenExpiresAt() {
  return new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000)
}

function isSessionActive(session: { revokedAt: Date | null; expiresAt: Date }) {
  return !session.revokedAt && session.expiresAt > new Date()
}

export const authService = {
  async login({ email, password }: LoginBody, userAgent: string | null = null) {
    const isValid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH)

    if (!isValid || email !== env.ADMIN_EMAIL) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const sessionId = randomUUID()

    const { token, secretHash } = createRefreshToken(sessionId)

    const expiresAt = refreshTokenExpiresAt()

    await authRepository.createSession({
      id: sessionId,
      refreshTokenHash: secretHash,
      expiresAt,
      userAgent,
    })

    return { sessionId, refreshToken: token, refreshTokenExpiresAt: expiresAt }
  },

  async refresh(refreshToken: string | undefined) {
    const parsed = refreshToken ? parseRefreshToken(refreshToken) : null

    if (!parsed) throw new UnauthorizedError('Invalid refresh token')

    const session = await authRepository.findSessionById(parsed.sessionId)

    if (!session || !isSessionActive(session)) {
      throw new UnauthorizedError('Invalid refresh token')
    }

    if (!secretMatchesHash(parsed.secret, session.refreshTokenHash)) {
      await authRepository.revokeSession(session.id)

      throw new UnauthorizedError('Invalid refresh token')
    }

    const { token, secretHash } = createRefreshToken(session.id)

    const expiresAt = refreshTokenExpiresAt()

    await authRepository.rotateSessionToken(session.id, secretHash, expiresAt)

    return { sessionId: session.id, refreshToken: token, refreshTokenExpiresAt: expiresAt }
  },

  async logout(refreshToken: string | undefined) {
    const parsed = refreshToken ? parseRefreshToken(refreshToken) : null

    if (!parsed) return

    const session = await authRepository.findSessionById(parsed.sessionId)

    if (session && secretMatchesHash(parsed.secret, session.refreshTokenHash)) {
      await authRepository.revokeSession(session.id)
    }
  },

  async isSessionValid(sessionId: string) {
    const session = await authRepository.findSessionById(sessionId)

    return Boolean(session && isSessionActive(session))
  },
}
