import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  normalizeError,
  isOperationalError,
  logger,
  logError,
} from '../utils';
import { AuthenticatedRequest } from './auth';
import config from '../config';

/**
 * Error Response Format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId?: string;
    details?: unknown;
    validationErrors?: Record<string, string[]>;
  };
}

/**
 * Global Error Handler Middleware
 * 
 * Catches all errors and returns appropriate HTTP responses.
 * Logs errors with context for debugging while keeping
 * user-facing messages safe and informative.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req as AuthenticatedRequest).correlationId || 'unknown';
  const userId = (req as AuthenticatedRequest).user?.id;

  // Normalize to AppError
  const error = normalizeError(err);

  // Log error with context (but no secrets)
  logError(err, {
    correlationId,
    userId,
    method: req.method,
    path: req.path,
    statusCode: error.statusCode,
    errorCode: error.code,
  });

  // Build response
  const response: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      correlationId,
    },
  };

  // Add validation errors if present
  if ('validationErrors' in error) {
    response.error.validationErrors = (error as AppError & { validationErrors: Record<string, string[]> }).validationErrors;
  }

  // Add details in development mode only
  if (config.server.isDevelopment && error.context) {
    response.error.details = error.context;
  }

  // For non-operational errors in production, use generic message
  if (config.server.isProduction && !isOperationalError(error)) {
    response.error.message = 'An unexpected error occurred';
    response.error.code = 'INTERNAL_ERROR';
  }

  res.status(error.statusCode).json(response);
}

/**
 * Not Found Handler
 * 
 * Catches requests to undefined routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req as AuthenticatedRequest).correlationId || 'unknown';

  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    correlationId,
  });

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      correlationId,
    },
  });
}

/**
 * Async Handler Wrapper
 * 
 * Wraps async route handlers to properly catch and forward errors
 * to the error handling middleware.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request Timeout Middleware
 * 
 * Adds timeout handling to requests
 */
export function timeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const timeout = config.server.requestTimeoutMs;

  // Set timeout
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      const correlationId = (req as AuthenticatedRequest).correlationId || 'unknown';
      
      logger.warn('Request timeout', {
        method: req.method,
        path: req.path,
        timeoutMs: timeout,
        correlationId,
      });

      res.status(504).json({
        error: {
          code: 'TIMEOUT',
          message: 'Request timeout',
          correlationId,
        },
      });
    }
  }, timeout);

  // Clear timeout when response finishes
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));

  next();
}
