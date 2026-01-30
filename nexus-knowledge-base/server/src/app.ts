import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import config from './config';
import routes from './routes';
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  responseTimeMiddleware,
  timeoutMiddleware,
} from './middleware';
import { logger } from './utils';

/**
 * Create and configure the Express application
 */
export function createApp(): Express {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.server.isDevelopment ? false : undefined,
  }));

  // CORS configuration
  app.use(cors({
    origin: config.security.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Change-Reason',
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-Response-Time',
    ],
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMax,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Request logging and timing
  app.use(responseTimeMiddleware);
  app.use(requestLogger);
  app.use(timeoutMiddleware);

  // Health check (outside /api for load balancers)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  logger.info('Express app configured', {
    environment: config.server.nodeEnv,
    corsOrigin: config.security.corsOrigin,
  });

  return app;
}

export default createApp;
