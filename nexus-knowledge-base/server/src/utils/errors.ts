/**
 * Custom error classes for the Knowledge Management System
 * These provide structured error handling with meaningful messages
 * and appropriate HTTP status codes
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   * Excludes stack trace and sensitive information
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.context && { details: this.context }),
      },
    };
  }
}

/**
 * 400 Bad Request - Invalid input or request format
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', context?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', context);
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', context);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', context);
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    identifier?: string,
    context?: Record<string, unknown>
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', context);
  }
}

/**
 * 409 Conflict - Resource conflict (e.g., article is locked by another user)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', context?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', context);
  }
}

/**
 * 422 Unprocessable Entity - Validation errors
 */
export class ValidationError extends AppError {
  public readonly validationErrors: Record<string, string[]>;

  constructor(
    errors: Record<string, string[]>,
    message: string = 'Validation failed'
  ) {
    super(message, 422, 'VALIDATION_ERROR', { errors });
    this.validationErrors = errors;
  }

  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        validationErrors: this.validationErrors,
      },
    };
  }
}

/**
 * 423 Locked - Resource is locked (article being edited)
 */
export class LockedError extends AppError {
  public readonly lockedBy: string;
  public readonly lockedAt: string;

  constructor(
    resource: string,
    lockedBy: string,
    lockedAt: string,
    context?: Record<string, unknown>
  ) {
    super(
      `${resource} is currently locked for editing`,
      423,
      'RESOURCE_LOCKED',
      { ...context, lockedBy, lockedAt }
    );
    this.lockedBy = lockedBy;
    this.lockedAt = lockedAt;
  }
}

/**
 * 429 Too Many Requests - Rate limiting
 */
export class RateLimitError extends AppError {
  constructor(
    retryAfterSeconds: number,
    message: string = 'Too many requests, please try again later'
  ) {
    super(message, 429, 'RATE_LIMITED', { retryAfter: retryAfterSeconds });
  }
}

/**
 * 500 Internal Server Error - Unexpected server errors
 */
export class InternalError extends AppError {
  constructor(
    message: string = 'An unexpected error occurred',
    context?: Record<string, unknown>
  ) {
    super(message, 500, 'INTERNAL_ERROR', context);
  }
}

/**
 * 503 Service Unavailable - Dependency failure
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    service: string,
    message: string = 'Service temporarily unavailable',
    context?: Record<string, unknown>
  ) {
    super(message, 503, 'SERVICE_UNAVAILABLE', { service, ...context });
  }
}

/**
 * 504 Gateway Timeout - Operation timed out
 */
export class TimeoutError extends AppError {
  constructor(
    operation: string,
    timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      504,
      'TIMEOUT',
      { operation, timeoutMs, ...context }
    );
  }
}

/**
 * File system specific error
 */
export class FileSystemError extends AppError {
  constructor(
    operation: string,
    filePath: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    // Don't include full file path in user-facing message for security
    const safeMessage = `File system error during ${operation}`;
    super(safeMessage, 500, 'FILE_SYSTEM_ERROR', {
      operation,
      // Log the filename only, not the full path
      fileName: filePath.split(/[/\\]/).pop(),
      originalError: originalError?.message,
      ...context,
    });
  }
}

/**
 * Check if an error is an operational error (expected, handled)
 * vs a programming error (unexpected, bug)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert unknown errors to AppError
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, {
      originalError: error.name,
    });
  }

  return new InternalError('An unknown error occurred', {
    originalError: String(error),
  });
}
