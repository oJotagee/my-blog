import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { viewRateLimit } from '../../plugins/security'
import { dashboardResponse, popularQuery, popularResponse, viewParams } from './analytics.dto'
import { analyticsService } from './analytics.service'

export const analyticsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/views/:slug',
    {
      config: { rateLimit: viewRateLimit },
      schema: {
        tags: ['Analytics'],
        summary: 'Count a view of a published post',
        description: 'Called by the front when the article is opened. Limited per IP.',
        params: viewParams,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await analyticsService.recordView(request.params.slug)

      return reply.status(204).send(null)
    },
  )

  app.get(
    '/popular',
    {
      schema: {
        tags: ['Analytics'],
        summary: 'Most viewed published posts',
        querystring: popularQuery,
        response: { 200: popularResponse },
      },
    },
    async (request) => analyticsService.popular(request.query.limit),
  )
}

export const adminAnalyticsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate)

  app.get(
    '/dashboard',
    {
      schema: {
        tags: ['Analytics'],
        summary: 'Totals, views of the last 30 days and the top posts',
        security: [{ bearerAuth: [] }],
        response: { 200: dashboardResponse },
      },
    },
    async () => analyticsService.dashboard(),
  )
}
