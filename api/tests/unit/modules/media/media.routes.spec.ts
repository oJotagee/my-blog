import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'

import type { mediaSchema } from '../../../../src/db/schema'
import { mediaRepository } from '../../../../src/modules/media/media.repository'
import { detectImageType } from '../../../../src/modules/media/media.service'
import { mediaStorage } from '../../../../src/modules/media/media.storage'
import { createTestApp, signIn } from '../../support/app'
import { useInMemoryRepositories } from '../../support/memory-repositories'

type Row = typeof mediaSchema.$inferSelect

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]

describe('media routes', () => {
  let rows: Row[]

  let objects: Map<string, Uint8Array>

  let usages: number

  let app: Awaited<ReturnType<typeof createTestApp>>

  let headers: Record<string, string>

  beforeEach(async () => {
    rows = []

    objects = new Map()

    usages = 0

    const store = useInMemoryRepositories()

    spyOn(mediaRepository, 'findById').mockImplementation(async (id) =>
      rows.find((row) => row.id === id),
    )

    spyOn(mediaRepository, 'countPending').mockImplementation(
      async () => rows.filter((row) => row.status === 'pending').length,
    )

    spyOn(mediaRepository, 'countUsages').mockImplementation(async () => usages)

    spyOn(mediaRepository, 'create').mockImplementation(async (data) => {
      const row = {
        width: null,
        height: null,
        alt: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as Row

      rows.push(row)

      return row
    })

    spyOn(mediaRepository, 'markReady').mockImplementation(async (id, changes) => {
      const row = rows.find((item) => item.id === id && item.status === 'pending')

      if (row) Object.assign(row, changes, { status: 'ready' })

      return row
    })

    spyOn(mediaRepository, 'markFailed').mockImplementation(async (id) => {
      const row = rows.find((item) => item.id === id)

      if (row) row.status = 'failed'
    })

    spyOn(mediaRepository, 'delete').mockImplementation(async (id) => {
      rows = rows.filter((row) => row.id !== id)
    })

    spyOn(mediaStorage, 'presignPut').mockResolvedValue('https://bucket.example.com/upload')

    spyOn(mediaStorage, 'head').mockImplementation(async (key) => {
      const body = objects.get(key)

      return body ? { size: body.length } : null
    })

    spyOn(mediaStorage, 'readHead').mockImplementation(
      async (key) => objects.get(key) ?? new Uint8Array(),
    )

    spyOn(mediaStorage, 'copy').mockImplementation(async (from, to) => {
      objects.set(to, objects.get(from) ?? new Uint8Array())
    })

    spyOn(mediaStorage, 'remove').mockImplementation(async (key) => {
      objects.delete(key)
    })

    app = await createTestApp()

    headers = signIn(app, store).headers
  })

  afterEach(async () => {
    await app.close()

    mock.restore()
  })

  async function presign(size = PNG.length) {
    return app.inject({
      method: 'POST',
      url: '/admin/media/presign',
      headers,
      payload: { contentType: 'image/png', size, width: 10, height: 20, alt: 'Diagrama' },
    })
  }

  it('requires login', async () => {
    const response = await app.inject({ method: 'POST', url: '/admin/media/presign' })

    expect(response.statusCode).toBe(401)
  })

  it('presigns an upload and stores a pending media', async () => {
    const response = await presign()

    expect(response.statusCode).toBe(201)

    expect(response.json()).toMatchObject({ uploadUrl: 'https://bucket.example.com/upload' })

    expect(rows).toHaveLength(1)

    expect(rows[0]).toMatchObject({ status: 'pending', width: 10, height: 20, alt: 'Diagrama' })
  })

  it('rejects non-images and files above the limit', async () => {
    const gif = await app.inject({
      method: 'POST',
      url: '/admin/media/presign',
      headers,
      payload: { contentType: 'image/gif', size: 100 },
    })

    expect((await presign(50 * 1024 * 1024)).statusCode).toBe(400)

    expect(gif.statusCode).toBe(400)
  })

  it('confirms a valid upload and returns the CDN url', async () => {
    const { mediaId } = (await presign()).json()

    objects.set(`pending/${mediaId}`, new Uint8Array(PNG))

    const response = await app.inject({
      method: 'POST',
      url: `/admin/media/${mediaId}/confirm`,
      headers,
    })

    expect(response.statusCode).toBe(200)

    expect(response.json()).toMatchObject({
      id: mediaId,
      status: 'ready',
      url: `https://cdn.example.com/media/${mediaId}.png`,
    })

    expect(objects.has(`pending/${mediaId}`)).toBe(false)

    expect(objects.has(`media/${mediaId}.png`)).toBe(true)
  })

  it('rejects an upload that is missing, with another size or not an image', async () => {
    const missing = (await presign()).json().mediaId

    const wrongSize = (await presign()).json().mediaId

    const fake = (await presign(4)).json().mediaId

    objects.set(`pending/${wrongSize}`, new Uint8Array(PNG.length + 1))

    objects.set(`pending/${fake}`, new Uint8Array([1, 2, 3, 4]))

    const confirm = async (id: string) =>
      (await app.inject({ method: 'POST', url: `/admin/media/${id}/confirm`, headers })).statusCode

    expect(await Promise.all([missing, wrongSize, fake].map(confirm))).toEqual([400, 400, 400])

    expect(rows.filter((row) => row.status === 'failed')).toHaveLength(2)

    expect(objects.size).toBe(0)
  })

  it('refuses to delete a media that a post uses', async () => {
    const { mediaId } = (await presign()).json()

    usages = 1

    const used = await app.inject({ method: 'DELETE', url: `/admin/media/${mediaId}`, headers })

    usages = 0

    const free = await app.inject({ method: 'DELETE', url: `/admin/media/${mediaId}`, headers })

    expect([used.statusCode, free.statusCode]).toEqual([409, 204])

    expect(rows).toHaveLength(0)
  })

  it('detects jpeg, png and webp by their first bytes', () => {
    const webp = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]

    expect(detectImageType(new Uint8Array(PNG))?.extension).toBe('png')

    expect(detectImageType(new Uint8Array(webp))?.extension).toBe('webp')

    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.extension).toBe('jpg')

    expect(detectImageType(new Uint8Array([1, 2, 3]))).toBeUndefined()
  })
})
