import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import {
  adminListQuery,
  adminListResponse,
  adminPostResponse,
  contentBody,
  createPostBody,
  postParams,
  publicListQuery,
  publicListResponse,
  publicPostResponse,
  slugParams,
  tagsBody,
  updatePostBody,
} from './posts.dto'
import { postsService } from './posts.service'

const security = [{ bearerAuth: [] }]

export const postsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '',
    {
      schema: {
        tags: ['Posts'],
        summary: 'List the published posts',
        description:
          'Newest first. Use q to search title, summary and tag names, and tag to filter by tag slug.',
        querystring: publicListQuery,
        response: { 200: publicListResponse },
      },
    },
    async (request) => postsService.listPublic(request.query),
  )

  app.get(
    '/:slug',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Get a published post by slug',
        description: 'number and total tell the position of the post in the newest-first list.',
        params: slugParams,
        response: { 200: publicPostResponse },
      },
    },
    async (request) => postsService.getPublic(request.params.slug),
  )
}

export const adminPostsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate)

  app.get(
    '/posts',
    {
      schema: {
        tags: ['Posts'],
        summary: 'List every post, drafts included',
        security,
        querystring: adminListQuery,
        response: { 200: adminListResponse },
      },
    },
    async (request) => postsService.listAdmin(request.query),
  )

  app.post(
    '/posts',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Create a draft post',
        description: 'The slug is generated from the title when it is not sent.',
        security,
        body: createPostBody,
        response: { 201: adminPostResponse },
      },
    },
    async (request, reply) => {
      const post = await postsService.create(request.body)

      return reply.status(201).send(post)
    },
  )

  app.get(
    '/posts/:id',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Get a post with its content, for the editor',
        security,
        params: postParams,
        response: { 200: adminPostResponse },
      },
    },
    async (request) => postsService.getAdmin(request.params.id),
  )

  app.patch(
    '/posts/:id',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Update the post fields',
        description: 'Partial update. Send null to clear summary, study dates or cover.',
        security,
        params: postParams,
        body: updatePostBody,
        response: { 200: adminPostResponse },
      },
    },
    async (request) => postsService.update(request.params.id, request.body),
  )

  app.delete(
    '/posts/:id',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Delete a post',
        description: 'Deletes its sections, blocks, references, tag links and views.',
        security,
        params: postParams,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await postsService.delete(request.params.id)

      return reply.status(204).send(null)
    },
  )

  app.put(
    '/posts/:id/content',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Replace the sections, blocks and references',
        description:
          'Send the whole content. Blocks with the same groupId in a section are shown side by side. Image blocks need a ready media id. Recalculates the reading time.',
        security,
        params: postParams,
        body: contentBody,
        response: { 200: adminPostResponse },
      },
    },
    async (request) => postsService.replaceContent(request.params.id, request.body),
  )

  app.put(
    '/posts/:id/tags',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Replace the tags of the post',
        security,
        params: postParams,
        body: tagsBody,
        response: { 200: adminPostResponse },
      },
    },
    async (request) => postsService.replaceTags(request.params.id, request.body.tagIds),
  )

  app.post(
    '/posts/:id/publish',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Publish the post',
        description:
          'Needs at least one block. The first publication date is kept when published again.',
        security,
        params: postParams,
        response: { 200: adminPostResponse },
      },
    },
    async (request, reply) => reply.send(await postsService.publish(request.params.id)),
  )

  app.post(
    '/posts/:id/unpublish',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Move the post back to draft',
        security,
        params: postParams,
        response: { 200: adminPostResponse },
      },
    },
    async (request, reply) => reply.send(await postsService.unpublish(request.params.id)),
  )
}
