import {
  ArticleVersion,
  VersionListResponse,
  VersionDiff,
  compareVersions,
  User,
  hasPermission,
} from '../models';
import {
  IVersionRepository,
  IArticleRepository,
  fileVersionRepository,
  fileArticleRepository,
} from '../repositories';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  logger,
} from '../utils';

/**
 * Version Service
 * 
 * Manages article version history for audit trail and rollback capabilities.
 */
export class VersionService {
  constructor(
    private versionRepository: IVersionRepository = fileVersionRepository,
    private articleRepository: IArticleRepository = fileArticleRepository
  ) {}

  /**
   * Get version history for an article
   */
  async getVersions(articleId: string, user: User): Promise<VersionListResponse> {
    // Check if article exists
    const article = await this.articleRepository.findById(articleId);
    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    // Check view permission
    if (!hasPermission(user, 'article:version:view')) {
      throw new ForbiddenError('You do not have permission to view version history');
    }

    // Draft visibility check
    if (article.status === 'draft' && article.authorId !== user.id) {
      if (!hasPermission(user, 'article:view:draft:all')) {
        throw new ForbiddenError('You do not have permission to view this article\'s history');
      }
    }

    return this.versionRepository.getVersions(articleId);
  }

  /**
   * Get a specific version
   */
  async getVersion(articleId: string, versionNumber: number, user: User): Promise<ArticleVersion> {
    // Check if article exists
    const article = await this.articleRepository.findById(articleId);
    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    // Check view permission
    if (!hasPermission(user, 'article:version:view')) {
      throw new ForbiddenError('You do not have permission to view version history');
    }

    const version = await this.versionRepository.getVersion(articleId, versionNumber);
    if (!version) {
      throw new NotFoundError('Version', `${articleId}/v${versionNumber}`);
    }

    return version;
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    articleId: string,
    version1: number,
    version2: number,
    user: User
  ): Promise<{ older: ArticleVersion; newer: ArticleVersion; diff: VersionDiff[] }> {
    const v1 = await this.getVersion(articleId, version1, user);
    const v2 = await this.getVersion(articleId, version2, user);

    // Ensure correct ordering
    const [older, newer] = version1 < version2 ? [v1, v2] : [v2, v1];
    const diff = compareVersions(older, newer);

    return { older, newer, diff };
  }

  /**
   * Restore an article to a previous version
   */
  async restoreVersion(
    articleId: string,
    versionNumber: number,
    user: User
  ): Promise<ArticleVersion> {
    // Check if article exists
    const article = await this.articleRepository.findById(articleId);
    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    // Check restore permission
    const canRestoreOwn = hasPermission(user, 'article:version:restore:own') && article.authorId === user.id;
    const canRestoreAll = hasPermission(user, 'article:version:restore:all');
    
    if (!canRestoreOwn && !canRestoreAll) {
      throw new ForbiddenError('You do not have permission to restore versions');
    }

    // Get the version to restore
    const versionToRestore = await this.versionRepository.getVersion(articleId, versionNumber);
    if (!versionToRestore) {
      throw new NotFoundError('Version', `${articleId}/v${versionNumber}`);
    }

    // Cannot restore to current version
    if (versionNumber === article.version) {
      throw new BadRequestError('Cannot restore to current version');
    }

    // Update article with version data (creates a new version)
    const restoredArticle = await this.articleRepository.update(articleId, {
      briefTitle: versionToRestore.briefTitle,
      detailedDescription: versionToRestore.detailedDescription,
      category: versionToRestore.category,
      tags: versionToRestore.tags,
      relatedArticles: versionToRestore.relatedArticles,
    });

    // Create a new version recording the restoration
    const newVersion = await this.versionRepository.createVersion(
      restoredArticle,
      user.id,
      user.displayName,
      `Restored from version ${versionNumber}`
    );

    logger.info('Version restored', {
      articleId,
      restoredFrom: versionNumber,
      newVersion: restoredArticle.version,
      userId: user.id,
    });

    return newVersion;
  }

  /**
   * Get the latest version number for an article
   */
  async getLatestVersionNumber(articleId: string): Promise<number> {
    const versions = await this.versionRepository.getVersions(articleId);
    return versions.currentVersion;
  }
}

// Export singleton instance
export const versionService = new VersionService();
