import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { mediaParams, mediaResponse, presignMediaBody, presignMediaResponse } from './media.dto'
import { mediaService } from './media.service'

export const adminMediaRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate)

  app.post(
    '/media/presign',
    {
      schema: {
        tags: ['Media'],
        summary: 'Create a presigned upload URL',
        description: 'Upload the file with PUT to uploadUrl, then call confirm.',
        security: [{ bearerAuth: [] }],
        body: presignMediaBody,
        response: { 201: presignMediaResponse },
      },
    },
    async (request, reply) => reply.status(201).send(await mediaService.presign(request.body)),
  )

  app.post(
    '/media/:id/confirm',
    {
      schema: {
        tags: ['Media'],
        summary: 'Validate an uploaded file and publish it',
        security: [{ bearerAuth: [] }],
        params: mediaParams,
        response: { 200: mediaResponse },
      },
    },
    async (request) => mediaService.confirm(request.params.id),
  )

  app.get(
    '/media/:id',
    {
      schema: {
        tags: ['Media'],
        summary: 'Get a media',
        security: [{ bearerAuth: [] }],
        params: mediaParams,
        response: { 200: mediaResponse },
      },
    },
    async (request) => mediaService.get(request.params.id),
  )

  app.delete(
    '/media/:id',
    {
      schema: {
        tags: ['Media'],
        summary: 'Delete a media',
        description: 'Fails with 409 while a post uses it.',
        security: [{ bearerAuth: [] }],
        params: mediaParams,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await mediaService.delete(request.params.id)

      return reply.status(204).send(null)
    },
  )
}
