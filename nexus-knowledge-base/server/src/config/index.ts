import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 * All configuration values are centralized here for easy management
 * and to support different environments (dev, test, prod)
 */
export const config = {
  // Server settings
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
  },

  // Data storage settings
  storage: {
    // Base path for all data storage - configurable via environment variable
    basePath: process.env.DATA_STORAGE_PATH 
      ? path.resolve(process.env.DATA_STORAGE_PATH)
      : path.resolve(__dirname, '../../data'),
    
    // Sub-directories for different data types
    get articlesPath() {
      return path.join(this.basePath, 'articles');
    },
    get versionsPath() {
      return path.join(this.basePath, 'versions');
    },
    get commentsPath() {
      return path.join(this.basePath, 'comments');
    },
    get locksPath() {
      return path.join(this.basePath, 'locks');
    },
    get usersPath() {
      return path.join(this.basePath, 'users');
    },
    get categoriesPath() {
      return path.join(this.basePath, 'categories');
    },
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH 
      ? path.resolve(process.env.LOG_FILE_PATH)
      : path.resolve(__dirname, '../../logs'),
  },

  // Security settings
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
  },

  // Article locking settings
  locking: {
    timeoutMinutes: parseInt(process.env.LOCK_TIMEOUT_MINUTES || '30', 10),
    get timeoutMs() {
      return this.timeoutMinutes * 60 * 1000;
    },
  },

  // Auto-save settings
  autosave: {
    intervalMs: parseInt(process.env.AUTOSAVE_INTERVAL_MS || '30000', 10),
  },

  // Retry settings for operations
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 4000,
  },
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const requiredEnvVars: string[] = [];
  
  // Add any required environment variables here
  // For production, you might require certain vars
  if (config.server.isProduction) {
    // requiredEnvVars.push('DATABASE_URL');
  }

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default config;
