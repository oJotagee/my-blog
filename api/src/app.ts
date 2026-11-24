import Fastify from 'fastify'

import { env } from './config/env'
import { healthRoutes } from './modules/health/health.routes'
import { registerErrorHandler } from './plugins/error-handler'
import { registerSwagger } from './plugins/swagger'
import { registerZod } from './plugins/zod'

export function buildApp() {
  const isDev = env.NODE_ENV === 'development'

  const app = Fastify({
    logger: isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : env.NODE_ENV === 'production',
  })

  registerZod(app)

  registerErrorHandler(app)

  registerSwagger(app)

  app.register(healthRoutes, { prefix: '/health' })

  return app
}
