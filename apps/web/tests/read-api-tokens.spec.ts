import { describe, expect, it } from 'bun:test'
import type { AxiosResponse } from 'axios'

import { readApiTokens } from '../src/lib/read-api-tokens'

const jwt = (payload: object) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`

const response = (accessToken: string, cookies?: string[]) =>
  ({ data: { accessToken }, headers: { 'set-cookie': cookies } }) as unknown as AxiosResponse<{
    accessToken: string
  }>

describe('readApiTokens', () => {
  it('reads the access token, its expiration and the refresh cookie', () => {
    const token = jwt({ exp: 1_800_000_000 })

    const cookies = ['other=1', 'refreshToken=session.secret; Path=/auth; HttpOnly']

    expect(readApiTokens(response(token, cookies))).toEqual({
      accessToken: token,
      refreshToken: 'session.secret',
      accessTokenExpiresAt: 1_800_000_000_000,
    })
  })

  it('fails without the refresh cookie or the expiration', () => {
    expect(() => readApiTokens(response(jwt({ exp: 1 })))).toThrow()

    expect(() => readApiTokens(response(jwt({}), ['refreshToken=a.b']))).toThrow()
  })
})
