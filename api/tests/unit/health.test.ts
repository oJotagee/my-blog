import { expect, test } from 'bun:test'

import { buildApp } from '../../src/app'

test('GET /health returns ok', async () => {
  const app = buildApp()

  const response = await app.inject({ method: 'GET', url: '/health' })

  expect(response.statusCode).toBe(200)
  expect(response.json()).toEqual({ status: 'ok' })

  await app.close()
})

test('GET /docs serves the Scalar reference', async () => {
  const app = buildApp()

  const response = await app.inject({ method: 'GET', url: '/docs/' })

  expect(response.statusCode).toBe(200)

  await app.close()
})
