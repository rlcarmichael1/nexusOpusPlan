import { useState, useCallback, useRef, useEffect } from 'react';
import { ArticleLock, LockStatusResponse } from '../types';
import { lockService } from '../services';
import { useUI } from '../contexts';

/**
 * Lock renewal interval (4 minutes - before 5 minute timeout)
 */
const LOCK_RENEWAL_INTERVAL = 4 * 60 * 1000;

/**
 * Custom hook for article locking
 */
export function useLock(articleId: string | undefined) {
  const [lock, setLock] = useState<ArticleLock | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isOwnLock, setIsOwnLock] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<string | null>(null);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renewalTimer = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useUI();

  /**
   * Clear renewal timer
   */
  const clearRenewalTimer = useCallback(() => {
    if (renewalTimer.current) {
      clearInterval(renewalTimer.current);
      renewalTimer.current = null;
    }
  }, []);

  /**
   * Start lock renewal timer
   */
  const startRenewalTimer = useCallback(() => {
    clearRenewalTimer();
    
    renewalTimer.current = setInterval(async () => {
      if (!articleId) return;
      
      try {
        const response = await lockService.renew(articleId);
        setLock(response.data);
      } catch (err) {
        console.error('Failed to renew lock:', err);
        addToast('Your lock has expired. Save your changes.', 'warning');
        clearRenewalTimer();
      }
    }, LOCK_RENEWAL_INTERVAL);
  }, [articleId, clearRenewalTimer, addToast]);

  /**
   * Check lock status
   */
  const checkStatus = useCallback(async (): Promise<LockStatusResponse | null> => {
    if (!articleId) return null;

    try {
      const response = await lockService.getStatus(articleId);
      const status = response.data;

      setIsLocked(status.isLocked);
      setIsOwnLock(status.isOwnLock);
      setLockedByUser(status.lockedBy?.displayName || null);

      if (status.lock) {
        setLock(status.lock);
      }

      return status;
    } catch (err) {
      console.error('Failed to check lock status:', err);
      return null;
    }
  }, [articleId]);

  /**
   * Acquire lock on article
   */
  const acquire = useCallback(async (): Promise<boolean> => {
    if (!articleId) return false;

    setIsAcquiring(true);
    setError(null);

    try {
      const response = await lockService.acquire(articleId);
      setLock(response.data);
      setIsLocked(true);
      setIsOwnLock(true);
      setLockedByUser(null);
      startRenewalTimer();
      return true;
    } catch (err: any) {
      const message = err.message || 'Failed to acquire lock';
      setError(message);
      addToast(message, 'error');
      
      // Check if locked by someone else
      await checkStatus();
      return false;
    } finally {
      setIsAcquiring(false);
    }
  }, [articleId, startRenewalTimer, checkStatus, addToast]);

  /**
   * Release lock on article
   */
  const release = useCallback(async (): Promise<boolean> => {
    if (!articleId) return false;

    clearRenewalTimer();

    try {
      await lockService.release(articleId);
      setLock(null);
      setIsLocked(false);
      setIsOwnLock(false);
      return true;
    } catch (err: any) {
      const message = err.message || 'Failed to release lock';
      setError(message);
      console.error('Failed to release lock:', err);
      return false;
    }
  }, [articleId, clearRenewalTimer]);

  /**
   * Force acquire (breaks existing lock - editors only)
   */
  const forceAcquire = useCallback(async (): Promise<boolean> => {
    // Same as acquire - backend handles force for editors
    return acquire();
  }, [acquire]);

  /**
   * Check status on mount and cleanup on unmount
   */
  useEffect(() => {
    if (articleId) {
      checkStatus();
    }

    return () => {
      clearRenewalTimer();
    };
  }, [articleId, checkStatus, clearRenewalTimer]);

  return {
    lock,
    isLocked,
    isOwnLock,
    lockedByUser,
    isAcquiring,
    error,
    acquire,
    release,
    forceAcquire,
    checkStatus,
  };
}

export default useLock;
