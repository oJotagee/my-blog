export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message)

    this.name = new.target.name
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable') {
    super(message, 503)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404)
  }
}
