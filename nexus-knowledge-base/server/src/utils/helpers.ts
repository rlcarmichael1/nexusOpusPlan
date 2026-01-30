import config from '../config';
import { TimeoutError } from './errors';
import logger from './logger';

/**
 * Sleep for a specified duration
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (0-indexed)
 * @param baseDelay Base delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = config.retry.baseDelayMs,
  maxDelay: number = config.retry.maxDelayMs
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Retry options for operations
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Execute an operation with retry logic
 * Uses exponential backoff between attempts
 * 
 * @param operation The async operation to execute
 * @param operationName Name for logging purposes
 * @param options Retry configuration options
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = config.retry.maxAttempts,
    baseDelayMs = config.retry.baseDelayMs,
    maxDelayMs = config.retry.maxDelayMs,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < maxAttempts - 1 && shouldRetry(lastError)) {
        const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs);
        
        logger.warn(`Operation '${operationName}' failed, retrying...`, {
          attempt: attempt + 1,
          maxAttempts,
          delayMs: delay,
          error: lastError.message,
        });

        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }

        await sleep(delay);
      } else {
        // Final attempt failed or error is not retryable
        logger.error(`Operation '${operationName}' failed after ${attempt + 1} attempts`, {
          attempts: attempt + 1,
          error: lastError.message,
        });
        throw lastError;
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error(`Operation '${operationName}' failed`);
}

/**
 * Execute an operation with a timeout
 * 
 * @param operation The async operation to execute
 * @param operationName Name for logging and error messages
 * @param timeoutMs Timeout in milliseconds
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeoutMs: number = config.server.requestTimeoutMs
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);

    operation()
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Execute an operation with both retry and timeout
 */
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: RetryOptions & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = config.server.requestTimeoutMs, ...retryOptions } = options;

  return withRetry(
    () => withTimeout(operation, operationName, timeoutMs),
    operationName,
    retryOptions
  );
}

/**
 * Debounce a function
 * @param fn Function to debounce
 * @param delayMs Delay in milliseconds
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize a string for safe file system operations
 * Removes or replaces characters that could cause issues
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid characters
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/-+/g, '-')           // Replace multiple dashes with single
    .replace(/_+/g, '_')           // Replace multiple underscores with single
    .toLowerCase()
    .slice(0, 100);                // Limit length
}

/**
 * Deep clone an object (safe for JSON-serializable data)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Omit specified keys from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick specified keys from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
