import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config';

// Ensure log directory exists
const logDir = config.logging.filePath;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Custom format for console output
 * Includes timestamp, level, message, and any additional metadata
 * IMPORTANT: Never log secrets, tokens, or sensitive user data
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present (excluding sensitive fields)
    const sanitizedMeta = sanitizeMetadata(metadata);
    if (Object.keys(sanitizedMeta).length > 0) {
      msg += ` ${JSON.stringify(sanitizedMeta)}`;
    }
    
    return msg;
  })
);

/**
 * Custom format for file output (JSON for easier parsing)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

/**
 * Sanitize metadata to remove sensitive information
 * Add any fields that should never be logged here
 */
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'cookie',
    'session',
    'creditCard',
    'ssn',
  ];

  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    
    // Skip sensitive fields
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Create the Winston logger instance
 */
const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'nexus-knowledge-base' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Create a child logger with additional context
 * Useful for adding request-specific information like correlation IDs
 */
export function createChildLogger(metadata: Record<string, unknown>): winston.Logger {
  return logger.child(sanitizeMetadata(metadata));
}

/**
 * Log an error with full context for debugging
 * @param error The error object
 * @param context Additional context for debugging
 */
export function logError(
  error: Error | unknown,
  context: Record<string, unknown> = {}
): void {
  const errorInfo: Record<string, unknown> = {
    ...sanitizeMetadata(context),
  };

  if (error instanceof Error) {
    errorInfo.errorName = error.name;
    errorInfo.errorMessage = error.message;
    errorInfo.errorStack = error.stack;
  } else {
    errorInfo.error = String(error);
  }

  logger.error('An error occurred', errorInfo);
}

/**
 * Log API request information
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  userId?: string
): void {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    durationMs,
    userId: userId || 'anonymous',
  });
}

export default logger;
