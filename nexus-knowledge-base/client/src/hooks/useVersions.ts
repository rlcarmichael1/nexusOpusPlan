import { useState, useCallback } from 'react';
import {
  ArticleVersion,
  VersionSummary,
  VersionCompareResponse,
} from '../types';
import { versionService } from '../services';

/**
 * Custom hook for article version history
 */
export function useVersions(articleId: string | undefined) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ArticleVersion | null>(null);
  const [comparison, setComparison] = useState<VersionCompareResponse | null>(null);
  const [latestVersion, setLatestVersion] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch version list for article
   */
  const fetchVersions = useCallback(async () => {
    if (!articleId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await versionService.getVersions(articleId);
      setVersions(response.data.versions);
      setLatestVersion(response.data.latestVersion);
    } catch (err: any) {
      const message = err.message || 'Failed to load versions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  /**
   * Fetch a specific version
   */
  const fetchVersion = useCallback(
    async (version: number) => {
      if (!articleId) return null;

      setIsLoading(true);
      setError(null);

      try {
        const response = await versionService.getVersion(articleId, version);
        setCurrentVersion(response.data);
        return response.data;
      } catch (err: any) {
        const message = err.message || 'Failed to load version';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [articleId]
  );

  /**
   * Compare two versions
   */
  const compareVersions = useCallback(
    async (v1: number, v2: number) => {
      if (!articleId) return null;

      setIsLoading(true);
      setError(null);

      try {
        const response = await versionService.compareVersions(articleId, v1, v2);
        setComparison(response.data);
        return response.data;
      } catch (err: any) {
        const message = err.message || 'Failed to compare versions';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [articleId]
  );

  /**
   * Restore article to a previous version
   */
  const restoreVersion = useCallback(
    async (version: number) => {
      if (!articleId) return null;

      setIsLoading(true);
      setError(null);

      try {
        const response = await versionService.restoreVersion(articleId, version);
        // Refresh version list after restore
        await fetchVersions();
        return response.data;
      } catch (err: any) {
        const message = err.message || 'Failed to restore version';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [articleId, fetchVersions]
  );

  /**
   * Clear current version view
   */
  const clearCurrentVersion = useCallback(() => {
    setCurrentVersion(null);
  }, []);

  /**
   * Clear comparison view
   */
  const clearComparison = useCallback(() => {
    setComparison(null);
  }, []);

  return {
    versions,
    currentVersion,
    comparison,
    latestVersion,
    isLoading,
    error,
    fetchVersions,
    fetchVersion,
    compareVersions,
    restoreVersion,
    clearCurrentVersion,
    clearComparison,
  };
}

export default useVersions;
