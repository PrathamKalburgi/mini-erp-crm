export interface ErrorDetail {
  field: string;
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[];

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code: string = 'INVALID_REQUEST', details?: ErrorDetail[]) {
    super(400, code, message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'UNAUTHENTICATED', details?: ErrorDetail[]) {
    super(401, code, message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', code: string = 'FORBIDDEN', details?: ErrorDetail[]) {
    super(403, code, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND', details?: ErrorDetail[]) {
    super(404, code, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource state conflict', code: string = 'CONFLICT', details?: ErrorDetail[]) {
    super(409, code, message, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string = 'Unprocessable request', code: string = 'VALIDATION_ERROR', details?: ErrorDetail[]) {
    super(422, code, message, details);
  }
}

export class ValidationError extends UnprocessableError {
  constructor(message: string = 'Validation failed', details?: ErrorDetail[]) {
    super(message, 'VALIDATION_ERROR', details);
  }
}
