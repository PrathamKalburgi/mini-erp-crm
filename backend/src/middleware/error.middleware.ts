import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorDetail } from '../utils/errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const responsePayload: {
      error: {
        code: string;
        message: string;
        details?: ErrorDetail[];
      };
    } = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if (err.details && err.details.length > 0) {
      responsePayload.error.details = err.details;
    }

    res.status(err.statusCode).json(responsePayload);
    return;
  }

  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      code: 'VALIDATION_ERROR',
      message: issue.message,
    }));

    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed for request parameters',
        details,
      },
    });
    return;
  }

  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Malformed JSON payload',
      },
    });
    return;
  }

  console.error('Unhandled Server Error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
