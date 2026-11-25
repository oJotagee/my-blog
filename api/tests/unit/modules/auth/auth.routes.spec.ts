import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

import { buildApp } from '../../../../src/app'
import { type Session, useInMemoryRepositories } from '../../support/memory-repositories'

const credentials = { email: 'admin@example.com', password: 'admin-password' }

describe('auth routes', () => {
  let sessions: Session[]

  let app: ReturnType<typeof buildApp>

  beforeEach(async () => {
    sessions = useInMemoryRepositories().sessions

    app = buildApp()

    app.log.level = 'silent'

    app.register(async (instance) => {
      instance.get('/protected', { onRequest: [instance.authenticate] }, async () => ({ ok: true }))
    })

    await app.ready()
  })

  afterEach(async () => {
    await app.close()

    mock.restore()
  })

  function login() {
    return app.inject({ method: 'POST', url: '/auth/login', payload: credentials })
  }

  function refreshCookie(response: { cookies: { name: string; value: string }[] }) {
    return response.cookies.find((cookie) => cookie.name === 'refreshToken')
  }

  it('POST /auth/login returns the access token and sets the refresh cookie', async () => {
    const response = await login()

    expect(response.statusCode).toBe(200)

    expect(response.json().accessToken).toBeString()

    expect(refreshCookie(response)).toMatchObject({ httpOnly: true, sameSite: 'Strict' })

    expect(sessions).toHaveLength(1)
  })

  it('POST /auth/login normalizes the e-mail', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { ...credentials, email: ' ADMIN@Example.com ' },
    })

    expect(response.statusCode).toBe(200)
  })

  it('POST /auth/login rejects a wrong password and a wrong e-mail with the same message', async () => {
    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { ...credentials, password: 'nope' },
    })

    const wrongEmail = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { ...credentials, email: 'other@example.com' },
    })

    expect(wrongPassword.statusCode).toBe(401)

    expect(wrongEmail.statusCode).toBe(401)

    expect(wrongPassword.json()).toEqual(wrongEmail.json())

    expect(sessions).toHaveLength(0)
  })

  it('POST /auth/login returns 400 for an invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'not-an-email' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('POST /auth/login is rate limited to 5 attempts per minute', async () => {
    const statuses: number[] = []

    for (let attempt = 0; attempt < 6; attempt++) {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { ...credentials, password: 'nope' },
      })

      statuses.push(response.statusCode)
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429])
  })

  it('protects routes with the access token', async () => {
    const { accessToken } = (await login()).json()

    const ok = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    const missing = await app.inject({ method: 'GET', url: '/protected' })

    expect(ok.statusCode).toBe(200)

    expect(missing.statusCode).toBe(401)
  })

  it('POST /auth/refresh rotates the refresh token and the old one stops working', async () => {
    const first = refreshCookie(await login())

    const refreshed = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refreshToken: first?.value ?? '' },
    })

    expect(refreshed.statusCode).toBe(200)

    expect(refreshCookie(refreshed)?.value).not.toBe(first?.value)

    const reused = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refreshToken: first?.value ?? '' },
    })

    expect(reused.statusCode).toBe(401)

    expect(sessions[0]?.revokedAt).not.toBeNull()
  })

  it('POST /auth/refresh returns 401 without a cookie', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/refresh' })

    expect(response.statusCode).toBe(401)
  })

  it('POST /auth/logout revokes the session and the access token stops working', async () => {
    const loginResponse = await login()

    const { accessToken } = loginResponse.json()

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { refreshToken: refreshCookie(loginResponse)?.value ?? '' },
    })

    expect(logout.statusCode).toBe(204)

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(response.statusCode).toBe(401)
  })
})
