import {
  ArticleLock,
  LockStatusResponse,
  LockAcquisitionResult,
  User,
  hasPermission,
} from '../models';
import {
  ILockRepository,
  IArticleRepository,
  fileLockRepository,
  fileArticleRepository,
} from '../repositories';
import {
  NotFoundError,
  ForbiddenError,
  logger,
} from '../utils';
import config from '../config';

/**
 * Lock Service
 * 
 * Manages article edit locks to prevent concurrent editing conflicts.
 * Provides pessimistic locking with automatic expiration.
 */
export class LockService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private lockRepository: ILockRepository = fileLockRepository,
    private articleRepository: IArticleRepository = fileArticleRepository
  ) {}

  /**
   * Start periodic cleanup of expired locks
   */
  startCleanupJob(): void {
    if (this.cleanupInterval) {
      return;
    }

    // Run cleanup every minute
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.lockRepository.cleanExpiredLocks();
      } catch (error) {
        logger.error('Lock cleanup failed', { error: (error as Error).message });
      }
    }, 60 * 1000);

    logger.info('Lock cleanup job started');
  }

  /**
   * Stop the cleanup job
   */
  stopCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Lock cleanup job stopped');
    }
  }

  /**
   * Acquire a lock on an article for editing
   */
  async acquireLock(articleId: string, user: User): Promise<LockAcquisitionResult> {
    // Check if article exists
    const article = await this.articleRepository.findById(articleId);
    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    // Check if user has edit permission
    const canEditOwn = hasPermission(user, 'article:edit:own') && article.authorId === user.id;
    const canEditAll = hasPermission(user, 'article:edit:all');
    
    if (!canEditOwn && !canEditAll) {
      throw new ForbiddenError('You do not have permission to edit this article');
    }

    // Try to acquire the lock
    const result = await this.lockRepository.acquireLock(articleId, user.id, user.displayName);

    if (result.success) {
      // Update article with lock info
      await this.updateArticleLockInfo(articleId, user.id, user.displayName);
    }

    return result;
  }

  /**
   * Release a lock on an article
   */
  async releaseLock(articleId: string, user: User): Promise<boolean> {
    // Check if article exists
    const exists = await this.articleRepository.exists(articleId);
    if (!exists) {
      throw new NotFoundError('Article', articleId);
    }

    // Get current lock status
    const lockStatus = await this.lockRepository.getLockStatus(articleId, user.id);
    
    // Only the lock owner (or editor for force unlock) can release
    if (lockStatus.isLocked && !lockStatus.canEdit) {
      if (!hasPermission(user, 'article:edit:all')) {
        throw new ForbiddenError('You cannot release a lock held by another user');
      }
      
      // Editor is force-releasing someone else's lock
      logger.warn('Force lock release by editor', {
        articleId,
        releasedBy: user.id,
        originalOwner: lockStatus.lock?.lockedBy,
      });
    }

    const released = await this.lockRepository.releaseLock(
      articleId, 
      lockStatus.lock?.lockedBy || user.id
    );

    if (released) {
      // Clear lock info from article
      await this.clearArticleLockInfo(articleId);
    }

    return released;
  }

  /**
   * Get lock status for an article
   */
  async getLockStatus(articleId: string, user: User): Promise<LockStatusResponse> {
    // Check if article exists
    const exists = await this.articleRepository.exists(articleId);
    if (!exists) {
      throw new NotFoundError('Article', articleId);
    }

    return this.lockRepository.getLockStatus(articleId, user.id);
  }

  /**
   * Renew an existing lock (extend expiration)
   */
  async renewLock(articleId: string, user: User): Promise<LockAcquisitionResult> {
    const lockStatus = await this.lockRepository.getLockStatus(articleId, user.id);
    
    if (!lockStatus.isLocked || !lockStatus.canEdit) {
      // No lock to renew or user doesn't own the lock
      return this.acquireLock(articleId, user);
    }

    // Re-acquire to extend expiration
    const result = await this.lockRepository.acquireLock(articleId, user.id, user.displayName);

    if (result.success) {
      await this.updateArticleLockInfo(articleId, user.id, user.displayName);
    }

    return result;
  }

  /**
   * Check if an article is currently locked
   */
  async isLocked(articleId: string): Promise<boolean> {
    return this.lockRepository.isLocked(articleId);
  }

  /**
   * Force release all locks for a user (e.g., on logout)
   */
  async releaseAllUserLocks(userId: string): Promise<void> {
    // In a file-based system, we need to scan all locks
    // This would be more efficient with a database
    logger.info('Releasing all locks for user', { userId });
    
    // For now, the cleanup job will handle expired locks
    // A production system would track user->lock mappings
  }

  /**
   * Update article with lock information
   */
  private async updateArticleLockInfo(
    articleId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    // This updates the article's lock fields without creating a new version
    const article = await this.articleRepository.findById(articleId);
    if (article) {
      article.lockedBy = userId;
      article.lockedByName = userName;
      article.lockedAt = new Date().toISOString();
      // Direct update without version increment would need repository modification
      // For now, this info is primarily tracked in the lock file
    }
  }

  /**
   * Clear lock information from article
   */
  private async clearArticleLockInfo(articleId: string): Promise<void> {
    const article = await this.articleRepository.findById(articleId);
    if (article) {
      delete article.lockedBy;
      delete article.lockedByName;
      delete article.lockedAt;
    }
  }
}

// Export singleton instance
export const lockService = new LockService();
