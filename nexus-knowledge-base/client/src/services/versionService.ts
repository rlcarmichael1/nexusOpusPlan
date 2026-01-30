import apiClient from './apiClient';
import { ArticleVersion, VersionListResponse, VersionCompareResponse } from '../types';

/**
 * Version Service
 * 
 * Handles version history API calls
 */
export const versionService = {
  /**
   * Get version history for an article
   */
  async getVersions(articleId: string): Promise<{ data: VersionListResponse }> {
    return apiClient.get<{ data: VersionListResponse }>(`/articles/${articleId}/versions`);
  },

  /**
   * Get a specific version
   */
  async getVersion(articleId: string, version: number): Promise<{ data: ArticleVersion }> {
    return apiClient.get<{ data: ArticleVersion }>(`/articles/${articleId}/versions/${version}`);
  },

  /**
   * Compare two versions
   */
  async compareVersions(
    articleId: string,
    v1: number,
    v2: number
  ): Promise<{ data: VersionCompareResponse }> {
    return apiClient.get<{ data: VersionCompareResponse }>(
      `/articles/${articleId}/versions/compare?v1=${v1}&v2=${v2}`
    );
  },

  /**
   * Restore an article to a previous version
   */
  async restoreVersion(
    articleId: string,
    version: number
  ): Promise<{ message: string; data: ArticleVersion }> {
    return apiClient.post<{ message: string; data: ArticleVersion }>(
      `/articles/${articleId}/versions/${version}/restore`
    );
  },
};

export default versionService;
