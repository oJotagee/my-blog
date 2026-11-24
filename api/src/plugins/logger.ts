import { type FastifyReply, type FastifyRequest, LogController } from 'fastify'

export class RequestLogController extends LogController {
  override incomingRequest() {}

  override routeNotFound() {}

  override requestCompleted(
    error: Error | null | undefined,
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (request.url.startsWith('/docs')) {
      return
    }

    const responseTime = Math.round(reply.elapsedTime)

    const message = `${request.method} ${request.url} ${reply.statusCode} ${responseTime}ms`

    const fields = { statusCode: reply.statusCode, responseTime }

    if (error) {
      reply.log.error({ ...fields, err: error }, message)

      return
    }

    reply.log.info(fields, message)
  }
}
