// Repository interfaces
export { IArticleRepository } from './IArticleRepository';
export { IVersionRepository, FileVersionRepository, fileVersionRepository } from './FileVersionRepository';
export { ICommentRepository, FileCommentRepository, fileCommentRepository } from './FileCommentRepository';
export { ILockRepository, FileLockRepository, fileLockRepository } from './FileLockRepository';
export { ICategoryRepository, FileCategoryRepository, fileCategoryRepository } from './FileCategoryRepository';

// File-based implementations
export { FileArticleRepository, fileArticleRepository } from './FileArticleRepository';

/**
 * Repository Factory
 * 
 * This factory provides the appropriate repository implementation based on configuration.
 * Currently only file-based repositories are implemented, but this can be extended
 * to support database repositories by:
 * 
 * 1. Creating new implementations (e.g., PostgresArticleRepository)
 * 2. Updating the factory to return the appropriate implementation
 * 3. Adding database configuration to config/index.ts
 * 
 * Example future extension:
 * 
 * ```typescript
 * import { DatabaseArticleRepository } from './DatabaseArticleRepository';
 * 
 * function getArticleRepository(): IArticleRepository {
 *   if (config.database.enabled) {
 *     return new DatabaseArticleRepository(config.database.connectionString);
 *   }
 *   return fileArticleRepository;
 * }
 * ```
 */

import { fileArticleRepository, FileArticleRepository } from './FileArticleRepository';
import { fileVersionRepository } from './FileVersionRepository';
import { fileCommentRepository } from './FileCommentRepository';
import { fileLockRepository } from './FileLockRepository';
import { fileCategoryRepository } from './FileCategoryRepository';
import { logger } from '../utils';

/**
 * Initialize all repositories
 * Call this at application startup
 */
export async function initializeRepositories(): Promise<void> {
  logger.info('Initializing repositories...');
  
  try {
    await Promise.all([
      fileArticleRepository.initialize(),
      fileVersionRepository.initialize(),
      fileCommentRepository.initialize(),
      fileLockRepository.initialize(),
      fileCategoryRepository.initialize(),
    ]);

    // Seed default categories if needed
    await fileCategoryRepository.seedDefaultCategories();

    logger.info('All repositories initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize repositories', { error: (error as Error).message });
    throw error;
  }
}

/**
 * Get all repository instances
 * Useful for dependency injection
 */
export function getRepositories() {
  return {
    articles: fileArticleRepository,
    versions: fileVersionRepository,
    comments: fileCommentRepository,
    locks: fileLockRepository,
    categories: fileCategoryRepository,
  };
}
