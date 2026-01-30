import { Request, Response, NextFunction } from 'express';
import { logger, logRequest } from '../utils';
import { AuthenticatedRequest } from './auth';

/**
 * Request Logging Middleware
 * 
 * Logs all incoming requests and their responses.
 * Tracks response time for performance monitoring.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = (req as AuthenticatedRequest).user?.id;

    logRequest(req.method, req.path, res.statusCode, duration, userId);
  });

  next();
}

/**
 * Response Time Header Middleware
 * 
 * Adds X-Response-Time header for client-side performance tracking
 */
export function responseTimeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const time = diff[0] * 1000 + diff[1] / 1000000;
    res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
  });

  next();
}
