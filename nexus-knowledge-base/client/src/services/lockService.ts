import apiClient from './apiClient';
import { LockStatusResponse, LockAcquisitionResult, ArticleLock } from '../types';

/**
 * Lock Service
 * 
 * Handles article locking API calls
 */
export const lockService = {
  /**
   * Get lock status for an article
   */
  async getStatus(articleId: string): Promise<{ data: LockStatusResponse }> {
    return apiClient.get<{ data: LockStatusResponse }>(`/articles/${articleId}/lock`);
  },

  /**
   * Acquire a lock on an article
   */
  async acquire(articleId: string): Promise<{ message: string; data: ArticleLock }> {
    return apiClient.post<{ message: string; data: ArticleLock }>(`/articles/${articleId}/lock`);
  },

  /**
   * Renew an existing lock
   */
  async renew(articleId: string): Promise<{ message: string; data: ArticleLock }> {
    return apiClient.put<{ message: string; data: ArticleLock }>(`/articles/${articleId}/lock`);
  },

  /**
   * Release a lock on an article
   */
  async release(articleId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/articles/${articleId}/lock`);
  },
};

export default lockService;
