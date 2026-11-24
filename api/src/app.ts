import Fastify from 'fastify'

import { env } from './config/env'
import { healthRoutes } from './modules/health/health.routes'
import { registerErrorHandler } from './plugins/error-handler'
import { RequestLogController } from './plugins/logger'
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
  })

  registerZod(app)

  registerErrorHandler(app)

  registerSwagger(app)

  app.register(healthRoutes, { prefix: '/health' })

  return app
}
