import {
  Article,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleSearchParams,
  PaginatedResponse,
  ArticleSummary,
  User,
  hasPermission,
  ARTICLE_VALIDATION,
} from '../models';
import {
  IArticleRepository,
  IVersionRepository,
  ILockRepository,
  ICategoryRepository,
  fileArticleRepository,
  fileVersionRepository,
  fileLockRepository,
  fileCategoryRepository,
} from '../repositories';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  logger,
} from '../utils';

/**
 * Validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Article Service
 * 
 * Handles business logic for article operations including:
 * - CRUD operations with RBAC
 * - Version management
 * - Validation
 * - Category article count updates
 */
export class ArticleService {
  constructor(
    private articleRepository: IArticleRepository = fileArticleRepository,
    private versionRepository: IVersionRepository = fileVersionRepository,
    private lockRepository: ILockRepository = fileLockRepository,
    private categoryRepository: ICategoryRepository = fileCategoryRepository
  ) {}

  /**
   * Validate article input
   */
  private validateArticleInput(
    input: CreateArticleInput | UpdateArticleInput,
    isCreate: boolean = false
  ): ValidationResult {
    const errors: Record<string, string[]> = {};

    // Title validation (required for create)
    if ('briefTitle' in input || isCreate) {
      const title = (input as CreateArticleInput).briefTitle || '';
      if (isCreate && !title) {
        errors.briefTitle = ['Title is required'];
      } else if (title) {
        if (title.length < ARTICLE_VALIDATION.TITLE_MIN_LENGTH) {
          errors.briefTitle = [`Title must be at least ${ARTICLE_VALIDATION.TITLE_MIN_LENGTH} characters`];
        } else if (title.length > ARTICLE_VALIDATION.TITLE_MAX_LENGTH) {
          errors.briefTitle = [`Title must not exceed ${ARTICLE_VALIDATION.TITLE_MAX_LENGTH} characters`];
        }
      }
    }

    // Description validation (required for create)
    if ('detailedDescription' in input || isCreate) {
      const desc = (input as CreateArticleInput).detailedDescription || '';
      if (isCreate && !desc) {
        errors.detailedDescription = ['Description is required'];
      } else if (desc) {
        if (desc.length < ARTICLE_VALIDATION.DESCRIPTION_MIN_LENGTH) {
          errors.detailedDescription = [`Description must be at least ${ARTICLE_VALIDATION.DESCRIPTION_MIN_LENGTH} characters`];
        } else if (desc.length > ARTICLE_VALIDATION.DESCRIPTION_MAX_LENGTH) {
          errors.detailedDescription = [`Description must not exceed ${ARTICLE_VALIDATION.DESCRIPTION_MAX_LENGTH} characters`];
        }
      }
    }

    // Category validation (required for create)
    if ('category' in input || isCreate) {
      const category = (input as CreateArticleInput).category || '';
      if (isCreate && !category) {
        errors.category = ['Category is required'];
      } else if (category && category.length > ARTICLE_VALIDATION.CATEGORY_MAX_LENGTH) {
        errors.category = [`Category must not exceed ${ARTICLE_VALIDATION.CATEGORY_MAX_LENGTH} characters`];
      }
    }

    // Tags validation
    if ('tags' in input && input.tags) {
      if (input.tags.length > ARTICLE_VALIDATION.MAX_TAGS) {
        errors.tags = [`Maximum ${ARTICLE_VALIDATION.MAX_TAGS} tags allowed`];
      } else {
        const invalidTags = input.tags.filter(t => t.length > ARTICLE_VALIDATION.TAG_MAX_LENGTH);
        if (invalidTags.length > 0) {
          errors.tags = [`Tags must not exceed ${ARTICLE_VALIDATION.TAG_MAX_LENGTH} characters`];
        }
      }
    }

    // Related articles validation
    if ('relatedArticles' in input && input.relatedArticles) {
      if (input.relatedArticles.length > ARTICLE_VALIDATION.MAX_RELATED_ARTICLES) {
        errors.relatedArticles = [`Maximum ${ARTICLE_VALIDATION.MAX_RELATED_ARTICLES} related articles allowed`];
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Create a new article
   */
  async create(input: CreateArticleInput, user: User): Promise<Article> {
    // Check permission
    if (!hasPermission(user, 'article:create')) {
      throw new ForbiddenError('You do not have permission to create articles');
    }

    // Validate input
    const validation = this.validateArticleInput(input, true);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // Create the article
    const article = await this.articleRepository.create(input, user.id, user.displayName);

    // Create initial version
    await this.versionRepository.createVersion(article, user.id, user.displayName, 'Initial creation');

    // Update category article count
    await this.categoryRepository.updateArticleCount(article.category, 1);

    logger.info('Article created via service', { articleId: article.id, userId: user.id });
    return article;
  }

  /**
   * Get article by ID with permission check
   */
  async getById(id: string, user: User): Promise<Article> {
    const article = await this.articleRepository.findById(id);
    
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    // Check view permissions
    if (article.status === 'deleted') {
      // Only editors can see deleted articles
      if (!hasPermission(user, 'article:delete:all')) {
        throw new NotFoundError('Article', id);
      }
    } else if (article.status === 'draft') {
      // Check draft visibility permissions
      if (article.authorId !== user.id && !hasPermission(user, 'article:view:draft:all')) {
        throw new ForbiddenError('You do not have permission to view this draft');
      }
    }

    // Increment view count for published articles
    if (article.status === 'published') {
      await this.articleRepository.incrementViewCount(id, user.id);
    }

    return article;
  }

  /**
   * Update an article
   */
  async update(
    id: string,
    input: UpdateArticleInput,
    user: User,
    changeReason?: string
  ): Promise<Article> {
    const article = await this.articleRepository.findById(id);
    
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    // Check edit permissions
    const canEditOwn = hasPermission(user, 'article:edit:own') && article.authorId === user.id;
    const canEditAll = hasPermission(user, 'article:edit:all');
    
    if (!canEditOwn && !canEditAll) {
      throw new ForbiddenError('You do not have permission to edit this article');
    }

    // Check if article is locked by another user
    const lockStatus = await this.lockRepository.getLockStatus(id, user.id);
    if (lockStatus.isLocked && !lockStatus.canEdit) {
      throw new ConflictError(`Article is currently being edited by ${lockStatus.lock?.lockedByName}`);
    }

    // Validate input
    const validation = this.validateArticleInput(input, false);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    // Handle category change
    const oldCategory = article.category;
    const newCategory = input.category;
    
    // Update the article
    const updatedArticle = await this.articleRepository.update(id, input);

    // Create version snapshot
    await this.versionRepository.createVersion(updatedArticle, user.id, user.displayName, changeReason);

    // Update category counts if category changed
    if (newCategory && newCategory !== oldCategory) {
      await this.categoryRepository.updateArticleCount(oldCategory, -1);
      await this.categoryRepository.updateArticleCount(newCategory, 1);
    }

    logger.info('Article updated via service', { articleId: id, userId: user.id });
    return updatedArticle;
  }

  /**
   * Soft delete an article (move to trash)
   */
  async delete(id: string, user: User): Promise<Article> {
    const article = await this.articleRepository.findById(id);
    
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    // Check delete permissions
    const canDeleteOwn = hasPermission(user, 'article:delete:own') && article.authorId === user.id;
    const canDeleteAll = hasPermission(user, 'article:delete:all');
    
    if (!canDeleteOwn && !canDeleteAll) {
      throw new ForbiddenError('You do not have permission to delete this article');
    }

    // Release any locks
    await this.lockRepository.releaseLock(id, article.lockedBy || user.id);

    // Soft delete
    const deletedArticle = await this.articleRepository.softDelete(id);

    // Update category count
    await this.categoryRepository.updateArticleCount(article.category, -1);

    // Create version for deletion
    await this.versionRepository.createVersion(deletedArticle, user.id, user.displayName, 'Moved to trash');

    logger.info('Article deleted via service', { articleId: id, userId: user.id });
    return deletedArticle;
  }

  /**
   * Permanently delete an article (editors only)
   */
  async permanentDelete(id: string, user: User): Promise<void> {
    if (!hasPermission(user, 'article:delete:all')) {
      throw new ForbiddenError('You do not have permission to permanently delete articles');
    }

    const article = await this.articleRepository.findById(id);
    
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    if (article.status !== 'deleted') {
      throw new BadRequestError('Article must be in trash before permanent deletion');
    }

    // Delete versions
    await this.versionRepository.deleteVersions(id);

    // Delete the article
    await this.articleRepository.hardDelete(id);

    logger.info('Article permanently deleted', { articleId: id, userId: user.id });
  }

  /**
   * Restore a deleted article
   */
  async restore(id: string, user: User): Promise<Article> {
    const article = await this.articleRepository.findById(id);
    
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    if (article.status !== 'deleted') {
      throw new BadRequestError('Article is not in trash');
    }

    // Check restore permissions
    const canRestoreOwn = hasPermission(user, 'article:restore:own') && article.authorId === user.id;
    const canRestoreAll = hasPermission(user, 'article:restore:all');
    
    if (!canRestoreOwn && !canRestoreAll) {
      throw new ForbiddenError('You do not have permission to restore this article');
    }

    const restoredArticle = await this.articleRepository.restore(id);

    // Update category count
    await this.categoryRepository.updateArticleCount(restoredArticle.category, 1);

    // Create version for restoration
    await this.versionRepository.createVersion(restoredArticle, user.id, user.displayName, 'Restored from trash');

    logger.info('Article restored via service', { articleId: id, userId: user.id });
    return restoredArticle;
  }

  /**
   * Publish an article
   */
  async publish(id: string, user: User): Promise<Article> {
    const article = await this.articleRepository.findById(id);
    
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    if (article.status !== 'draft') {
      throw new BadRequestError('Only draft articles can be published');
    }

    // Check publish permissions
    const canPublishOwn = hasPermission(user, 'article:publish:own') && article.authorId === user.id;
    const canPublishAll = hasPermission(user, 'article:publish:all');
    
    if (!canPublishOwn && !canPublishAll) {
      throw new ForbiddenError('You do not have permission to publish this article');
    }

    const publishedArticle = await this.articleRepository.update(id, { status: 'published' });

    // Create version for publication
    await this.versionRepository.createVersion(publishedArticle, user.id, user.displayName, 'Published');

    logger.info('Article published via service', { articleId: id, userId: user.id });
    return publishedArticle;
  }

  /**
   * Archive an article (editors only)
   */
  async archive(id: string, user: User): Promise<Article> {
    if (!hasPermission(user, 'article:archive')) {
      throw new ForbiddenError('You do not have permission to archive articles');
    }

    const article = await this.articleRepository.findById(id);
    
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    if (article.status !== 'published') {
      throw new BadRequestError('Only published articles can be archived');
    }

    const archivedArticle = await this.articleRepository.update(id, { status: 'archived' });

    // Create version for archival
    await this.versionRepository.createVersion(archivedArticle, user.id, user.displayName, 'Archived');

    logger.info('Article archived via service', { articleId: id, userId: user.id });
    return archivedArticle;
  }

  /**
   * Search articles with RBAC filtering
   */
  async search(params: ArticleSearchParams, user: User): Promise<PaginatedResponse<ArticleSummary>> {
    const canViewAllDrafts = hasPermission(user, 'article:view:draft:all');
    return this.articleRepository.search(params, user.id, canViewAllDrafts);
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<Array<{ name: string; count: number }>> {
    return this.articleRepository.getAllTags();
  }

  /**
   * Get related articles
   */
  async getRelatedArticles(articleId: string, limit?: number): Promise<ArticleSummary[]> {
    return this.articleRepository.getRelatedArticles(articleId, limit);
  }
}

// Export singleton instance
export const articleService = new ArticleService();
