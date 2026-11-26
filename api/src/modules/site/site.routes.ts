import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { adminSiteResponse, publicSiteResponse, siteBody } from './site.dto'
import { siteService } from './site.service'

export const siteRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '',
    {
      schema: {
        tags: ['Site'],
        summary: 'Home texts, footer and the featured post',
        description:
          'The featured post is the one chosen in the panel. Without a valid choice, it is the latest published post.',
        response: { 200: publicSiteResponse },
      },
    },
    async () => siteService.getPublic(),
  )
}

export const adminSiteRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', app.authenticate)

  app.get(
    '/site',
    {
      schema: {
        tags: ['Site'],
        summary: 'Get the home settings as saved',
        security: [{ bearerAuth: [] }],
        response: { 200: adminSiteResponse },
      },
    },
    async () => siteService.getAdmin(),
  )

  app.put(
    '/site',
    {
      schema: {
        tags: ['Site'],
        summary: 'Replace the home settings',
        description: 'Send every field. Use null to clear one.',
        security: [{ bearerAuth: [] }],
        body: siteBody,
        response: { 200: adminSiteResponse },
      },
    },
    async (request) => siteService.update(request.body),
  )
}
