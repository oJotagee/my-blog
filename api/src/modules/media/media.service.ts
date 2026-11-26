import { randomUUID } from 'node:crypto'

import { env } from '../../config/env'
import type { mediaSchema } from '../../db/schema'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
} from '../../shared/errors'
import { mediaUrl } from '../../shared/media-url'
import type { PresignMediaBody } from './media.dto'
import { mediaRepository } from './media.repository'
import { mediaStorage, UPLOAD_EXPIRES_IN } from './media.storage'

type Media = typeof mediaSchema.$inferSelect

const MAX_PENDING = 20

const imageSignatures = [
  { mimeType: 'image/jpeg', extension: 'jpg', bytes: [[0, [0xff, 0xd8, 0xff]]] },
  {
    mimeType: 'image/png',
    extension: 'png',
    bytes: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
  },
  {
    mimeType: 'image/webp',
    extension: 'webp',
    bytes: [
      [0, [0x52, 0x49, 0x46, 0x46]],
      [8, [0x57, 0x45, 0x42, 0x50]],
    ],
  },
] as const

export function detectImageType(head: Uint8Array) {
  return imageSignatures.find((signature) =>
    signature.bytes.every(([offset, bytes]) =>
      bytes.every((byte, index) => head[offset + index] === byte),
    ),
  )
}

function assertStorageConfigured() {
  if (!env.AWS_REGION || !env.S3_BUCKET || !env.CDN_URL) {
    throw new ServiceUnavailableError('Media storage is not configured')
  }
}

async function getMediaOrThrow(id: string) {
  const media = await mediaRepository.findById(id)

  if (!media) throw new NotFoundError('Media not found')

  return media
}

function toResponse({ id, status, mimeType, size, width, height, alt, key }: Media) {
  return {
    id,
    status,
    mimeType,
    size,
    width,
    height,
    alt,
    url: status === 'ready' ? mediaUrl(key) : null,
  }
}

async function reject(media: Media, message: string): Promise<never> {
  await mediaRepository.markFailed(media.id)

  await mediaStorage.remove(media.key)

  throw new BadRequestError(message)
}

export const mediaService = {
  async presign({ contentType, size, width, height, alt }: PresignMediaBody) {
    assertStorageConfigured()

    if ((await mediaRepository.countPending()) >= MAX_PENDING) {
      throw new BadRequestError('Too many pending uploads, confirm or delete them first')
    }

    const id = randomUUID()

    const key = `pending/${id}`

    await mediaRepository.create({ id, key, mimeType: contentType, size, width, height, alt })

    const uploadUrl = await mediaStorage.presignPut(key, contentType, size)

    return { mediaId: id, uploadUrl, expiresIn: UPLOAD_EXPIRES_IN }
  },

  async confirm(id: string) {
    assertStorageConfigured()

    const media = await getMediaOrThrow(id)

    if (media.status === 'ready') return toResponse(media)

    if (media.status === 'failed') throw new ConflictError('Upload failed, request a new one')

    const object = await mediaStorage.head(media.key)

    if (!object) throw new BadRequestError('Upload not found')

    if (object.size !== media.size) return reject(media, 'Uploaded file size does not match')

    const detected = detectImageType(await mediaStorage.readHead(media.key))

    if (!detected || detected.mimeType !== media.mimeType) {
      return reject(media, 'Uploaded file is not a valid image')
    }

    const key = `media/${media.id}.${detected.extension}`

    await mediaStorage.copy(media.key, key, detected.mimeType)

    await mediaStorage.remove(media.key)

    const ready = await mediaRepository.markReady(media.id, { key, mimeType: detected.mimeType })

    return toResponse(ready ?? (await getMediaOrThrow(id)))
  },

  async get(id: string) {
    return toResponse(await getMediaOrThrow(id))
  },

  async delete(id: string) {
    assertStorageConfigured()

    const media = await getMediaOrThrow(id)

    if ((await mediaRepository.countUsages(id)) > 0) {
      throw new ConflictError('Media is in use, remove it from the posts first')
    }

    await mediaStorage.remove(media.key)

    await mediaRepository.delete(id)
  },
}
