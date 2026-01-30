/**
 * Edit lock for preventing concurrent edits
 */
export interface ArticleLock {
  articleId: string;
  lockedBy: string;
  lockedByName: string;
  lockedAt: string;
  expiresAt: string;
}

/**
 * Lock status response
 */
export interface LockStatusResponse {
  isLocked: boolean;
  lock?: ArticleLock;
  canEdit: boolean;
  message?: string;
}

/**
 * Lock acquisition result
 */
export interface LockAcquisitionResult {
  success: boolean;
  lock?: ArticleLock;
  message: string;
}
