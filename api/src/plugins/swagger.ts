import fastifySwagger from '@fastify/swagger'
import scalarApiReference from '@scalar/fastify-api-reference'
import type { FastifyInstance } from 'fastify'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

export function registerSwagger(app: FastifyInstance) {
  app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Blog API',
        description: 'API for the blog application',
        version: '1.0.0',
      },
    },
    transform: jsonSchemaTransform,
  })

  app.register(scalarApiReference, { routePrefix: '/docs' })
}
