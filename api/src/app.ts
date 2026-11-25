import Fastify from 'fastify'

import { env } from './config/env'
import { authRoutes } from './modules/auth/auth.routes'
import { healthRoutes } from './modules/health/health.routes'
import { adminTagsRoutes, tagsRoutes } from './modules/tags/tags.routes'
import { authPlugin } from './plugins/auth'
import { registerErrorHandler } from './plugins/error-handler'
import { RequestLogController } from './plugins/logger'
import { registerSecurity } from './plugins/security'
import { registerSwagger } from './plugins/swagger'
import { registerZod } from './plugins/zod'

export function buildApp() {
  const isDev = env.NODE_ENV === 'development'

  const app = Fastify({
    logger: isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss',
              singleLine: true,
              ignore: 'pid,hostname,reqId,statusCode,responseTime',
            },
          },
        }
      : env.NODE_ENV === 'production',
    logController: new RequestLogController(),
    trustProxy:
      env.NODE_ENV === 'production' ? (_address: string, hop: number) => hop === 0 : false,
  })

  registerZod(app)

  registerErrorHandler(app)

  registerSecurity(app)

  registerSwagger(app)

  app.register(authPlugin)

  app.register(healthRoutes, { prefix: '/health' })
  app.register(authRoutes, { prefix: '/auth' })
  app.register(tagsRoutes, { prefix: '/tags' })
  app.register(adminTagsRoutes, { prefix: '/admin' })

  return app
}
