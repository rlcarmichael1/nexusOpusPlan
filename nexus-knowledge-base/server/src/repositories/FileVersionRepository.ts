import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import {
  ArticleVersion,
  VersionListResponse,
  Article,
  createVersionFromArticle,
} from '../models';
import config from '../config';
import { logger, FileSystemError, NotFoundError, withRetry } from '../utils';

/**
 * Version Repository Interface
 */
export interface IVersionRepository {
  createVersion(
    article: Article,
    changedBy: string,
    changedByName: string,
    changeReason?: string
  ): Promise<ArticleVersion>;
  
  getVersions(articleId: string): Promise<VersionListResponse>;
  getVersion(articleId: string, version: number): Promise<ArticleVersion | null>;
  deleteVersions(articleId: string): Promise<void>;
}

/**
 * File-based Version Repository
 * 
 * Stores article versions in a subdirectory structure:
 * /versions/{articleId}/{version}.json
 */
export class FileVersionRepository implements IVersionRepository {
  private readonly versionsDir: string;

  constructor() {
    this.versionsDir = config.storage.versionsPath;
  }

  /**
   * Initialize the repository
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.versionsDir, { recursive: true });
      logger.info('File version repository initialized', { path: this.versionsDir });
    } catch (error) {
      throw new FileSystemError('initialize version repository', this.versionsDir, error as Error);
    }
  }

  /**
   * Get directory path for an article's versions
   */
  private getArticleVersionsDir(articleId: string): string {
    return path.join(this.versionsDir, articleId);
  }

  /**
   * Get file path for a specific version
   */
  private getVersionFilePath(articleId: string, version: number): string {
    return path.join(this.getArticleVersionsDir(articleId), `v${version}.json`);
  }

  async createVersion(
    article: Article,
    changedBy: string,
    changedByName: string,
    changeReason?: string
  ): Promise<ArticleVersion> {
    const versionData = createVersionFromArticle(article, changedBy, changedByName, changeReason);
    
    const version: ArticleVersion = {
      id: uuidv4(),
      ...versionData,
    };

    const articleVersionsDir = this.getArticleVersionsDir(article.id);
    
    await withRetry(
      async () => {
        await fs.mkdir(articleVersionsDir, { recursive: true });
        await fs.writeFile(
          this.getVersionFilePath(article.id, version.version),
          JSON.stringify(version, null, 2),
          'utf-8'
        );
      },
      'save version to file',
      { maxAttempts: 3 }
    );

    logger.info('Version created', { 
      articleId: article.id, 
      version: version.version,
      changedBy 
    });

    return version;
  }

  async getVersions(articleId: string): Promise<VersionListResponse> {
    const articleVersionsDir = this.getArticleVersionsDir(articleId);
    
    try {
      const files = await fs.readdir(articleVersionsDir);
      const versionFiles = files.filter(f => f.startsWith('v') && f.endsWith('.json'));
      
      const versions: ArticleVersion[] = [];
      
      for (const file of versionFiles) {
        try {
          const content = await fs.readFile(
            path.join(articleVersionsDir, file),
            'utf-8'
          );
          versions.push(JSON.parse(content) as ArticleVersion);
        } catch (error) {
          logger.warn('Failed to load version file', { file, error: (error as Error).message });
        }
      }

      // Sort by version number descending
      versions.sort((a, b) => b.version - a.version);

      return {
        articleId,
        currentVersion: versions[0]?.version || 0,
        versions,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          articleId,
          currentVersion: 0,
          versions: [],
        };
      }
      throw new FileSystemError('read versions', articleId, error as Error);
    }
  }

  async getVersion(articleId: string, version: number): Promise<ArticleVersion | null> {
    try {
      const filePath = this.getVersionFilePath(articleId, version);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as ArticleVersion;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new FileSystemError('read version', `${articleId}/v${version}`, error as Error);
    }
  }

  async deleteVersions(articleId: string): Promise<void> {
    const articleVersionsDir = this.getArticleVersionsDir(articleId);
    
    try {
      await fs.rm(articleVersionsDir, { recursive: true, force: true });
      logger.info('Versions deleted', { articleId });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new FileSystemError('delete versions', articleId, error as Error);
      }
    }
  }
}

// Export singleton instance
export const fileVersionRepository = new FileVersionRepository();
