import { createApp } from './app';
import config, { validateConfig } from './config';
import { initializeRepositories } from './repositories';
import { lockService } from './services';
import { logger } from './utils';

/**
 * Application entry point
 * 
 * Initializes the server with:
 * - Configuration validation
 * - Repository initialization
 * - Background jobs (lock cleanup)
 * - HTTP server startup
 */
async function main(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Initialize repositories (creates data directories, seeds categories)
    await initializeRepositories();

    // Create Express app
    const app = createApp();

    // Start lock cleanup background job
    lockService.startCleanupJob();

    // Start HTTP server
    const server = app.listen(config.server.port, () => {
      logger.info(`🚀 Server started`, {
        port: config.server.port,
        environment: config.server.nodeEnv,
        dataPath: config.storage.basePath,
      });

      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Nexus Knowledge Base API Server                          ║
║                                                            ║
║   Status:    Running                                       ║
║   Port:      ${config.server.port.toString().padEnd(44)}║
║   Env:       ${config.server.nodeEnv.padEnd(44)}║
║                                                            ║
║   API:       http://localhost:${config.server.port}/api${' '.repeat(26)}║
║   Health:    http://localhost:${config.server.port}/health${' '.repeat(23)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Stop background jobs
      lockService.stopCleanupJob();

      // Give time for in-flight requests to complete
      setTimeout(() => {
        logger.info('Graceful shutdown complete');
        process.exit(0);
      }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

// Start the application
main();
