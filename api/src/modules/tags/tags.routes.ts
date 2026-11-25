import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { skillResponse, tagBody, tagParams, tagResponse, tagWithCountResponse } from './tags.dto'
import { tagsService } from './tags.service'

export const tagsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '',
    {
      schema: {
        tags: ['Tags'],
        summary: 'List the tags used by published posts',
        response: { 200: z.array(tagWithCountResponse) },
      },
    },
    async () => tagsService.listPublic(),
  )
}

export const adminTagsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate)

  app.get(
    '/tags',
    {
      schema: {
        tags: ['Tags'],
        summary: 'List every tag with its post count',
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(tagWithCountResponse) },
      },
    },
    async () => tagsService.listAll(),
  )

  app.post(
    '/tags',
    {
      schema: {
        tags: ['Tags'],
        summary: 'Create a tag',
        description: 'The slug is generated from the name.',
        security: [{ bearerAuth: [] }],
        body: tagBody,
        response: { 201: tagResponse },
      },
    },
    async (request, reply) => {
      const tag = await tagsService.create(request.body)

      return reply.status(201).send(tag)
    },
  )

  app.patch(
    '/tags/:id',
    {
      schema: {
        tags: ['Tags'],
        summary: 'Rename a tag',
        description: 'The slug is generated again from the new name.',
        security: [{ bearerAuth: [] }],
        params: tagParams,
        body: tagBody,
        response: { 200: tagResponse },
      },
    },
    async (request) => tagsService.update(request.params.id, request.body),
  )

  app.delete(
    '/tags/:id',
    {
      schema: {
        tags: ['Tags'],
        summary: 'Delete a tag',
        description: 'Removes the tag from every post. The posts stay.',
        security: [{ bearerAuth: [] }],
        params: tagParams,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await tagsService.delete(request.params.id)

      return reply.status(204).send(null)
    },
  )

  app.get(
    '/skills',
    {
      schema: {
        tags: ['Tags'],
        summary: 'List what was studied, for LinkedIn and the resume',
        description:
          'Tags of published posts with the post count and the first and last study dates.',
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(skillResponse) },
      },
    },
    async () => tagsService.listSkills(),
  )
}
