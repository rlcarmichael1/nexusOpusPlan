import fs from 'fs/promises';
import path from 'path';

import { ArticleLock, LockStatusResponse, LockAcquisitionResult } from '../models';
import config from '../config';
import { logger, FileSystemError, withRetry } from '../utils';

/**
 * Lock Repository Interface
 */
export interface ILockRepository {
  acquireLock(
    articleId: string,
    userId: string,
    userName: string
  ): Promise<LockAcquisitionResult>;
  
  releaseLock(articleId: string, userId: string): Promise<boolean>;
  getLockStatus(articleId: string, userId: string): Promise<LockStatusResponse>;
  isLocked(articleId: string): Promise<boolean>;
  cleanExpiredLocks(): Promise<number>;
}

/**
 * File-based Lock Repository
 * 
 * Stores locks as individual JSON files:
 * /locks/{articleId}.lock.json
 */
export class FileLockRepository implements ILockRepository {
  private readonly locksDir: string;

  constructor() {
    this.locksDir = config.storage.locksPath;
  }

  /**
   * Initialize the repository
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.locksDir, { recursive: true });
      logger.info('File lock repository initialized', { path: this.locksDir });
    } catch (error) {
      throw new FileSystemError('initialize lock repository', this.locksDir, error as Error);
    }
  }

  /**
   * Get file path for a lock
   */
  private getFilePath(articleId: string): string {
    return path.join(this.locksDir, `${articleId}.lock.json`);
  }

  /**
   * Load lock from file
   */
  private async loadLock(articleId: string): Promise<ArticleLock | null> {
    try {
      const content = await fs.readFile(this.getFilePath(articleId), 'utf-8');
      return JSON.parse(content) as ArticleLock;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new FileSystemError('load lock', articleId, error as Error);
    }
  }

  /**
   * Save lock to file
   */
  private async saveLock(lock: ArticleLock): Promise<void> {
    await withRetry(
      async () => {
        await fs.writeFile(
          this.getFilePath(lock.articleId),
          JSON.stringify(lock, null, 2),
          'utf-8'
        );
      },
      'save lock to file',
      { maxAttempts: 3 }
    );
  }

  /**
   * Delete lock file
   */
  private async deleteLock(articleId: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(articleId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new FileSystemError('delete lock', articleId, error as Error);
      }
    }
  }

  /**
   * Check if a lock is expired
   */
  private isExpired(lock: ArticleLock): boolean {
    return new Date(lock.expiresAt) < new Date();
  }

  async acquireLock(
    articleId: string,
    userId: string,
    userName: string
  ): Promise<LockAcquisitionResult> {
    const existingLock = await this.loadLock(articleId);

    // Check if there's an existing valid lock
    if (existingLock && !this.isExpired(existingLock)) {
      // Same user can re-acquire their own lock
      if (existingLock.lockedBy === userId) {
        const renewedLock = this.createLock(articleId, userId, userName);
        await this.saveLock(renewedLock);
        
        logger.info('Lock renewed', { articleId, userId });
        return {
          success: true,
          lock: renewedLock,
          message: 'Lock renewed successfully',
        };
      }

      // Different user - lock is held by someone else
      return {
        success: false,
        lock: existingLock,
        message: `Article is currently being edited by ${existingLock.lockedByName}`,
      };
    }

    // No existing lock or lock expired - create new lock
    const newLock = this.createLock(articleId, userId, userName);
    await this.saveLock(newLock);

    logger.info('Lock acquired', { articleId, userId });
    return {
      success: true,
      lock: newLock,
      message: 'Lock acquired successfully',
    };
  }

  private createLock(articleId: string, userId: string, userName: string): ArticleLock {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.locking.timeoutMs);

    return {
      articleId,
      lockedBy: userId,
      lockedByName: userName,
      lockedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async releaseLock(articleId: string, userId: string): Promise<boolean> {
    const existingLock = await this.loadLock(articleId);

    if (!existingLock) {
      return true; // No lock to release
    }

    // Only the lock owner can release the lock
    if (existingLock.lockedBy !== userId) {
      logger.warn('Unauthorized lock release attempt', { 
        articleId, 
        attemptedBy: userId,
        lockedBy: existingLock.lockedBy 
      });
      return false;
    }

    await this.deleteLock(articleId);
    logger.info('Lock released', { articleId, userId });
    return true;
  }

  async getLockStatus(articleId: string, userId: string): Promise<LockStatusResponse> {
    const lock = await this.loadLock(articleId);

    if (!lock) {
      return {
        isLocked: false,
        canEdit: true,
      };
    }

    if (this.isExpired(lock)) {
      // Clean up expired lock
      await this.deleteLock(articleId);
      return {
        isLocked: false,
        canEdit: true,
        message: 'Previous edit lock has expired',
      };
    }

    const canEdit = lock.lockedBy === userId;
    return {
      isLocked: true,
      lock,
      canEdit,
      message: canEdit 
        ? 'You have the edit lock' 
        : `Article is being edited by ${lock.lockedByName}`,
    };
  }

  async isLocked(articleId: string): Promise<boolean> {
    const lock = await this.loadLock(articleId);
    return lock !== null && !this.isExpired(lock);
  }

  async cleanExpiredLocks(): Promise<number> {
    let cleanedCount = 0;

    try {
      const files = await fs.readdir(this.locksDir);
      
      for (const file of files) {
        if (!file.endsWith('.lock.json')) continue;

        const articleId = file.replace('.lock.json', '');
        const lock = await this.loadLock(articleId);

        if (lock && this.isExpired(lock)) {
          await this.deleteLock(articleId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Expired locks cleaned', { count: cleanedCount });
      }
    } catch (error) {
      logger.error('Error cleaning expired locks', { error: (error as Error).message });
    }

    return cleanedCount;
  }
}

// Export singleton instance
export const fileLockRepository = new FileLockRepository();
