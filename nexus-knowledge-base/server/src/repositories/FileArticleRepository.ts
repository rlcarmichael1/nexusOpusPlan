import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { IArticleRepository } from './IArticleRepository';
import {
  Article,
  ArticleSearchParams,
  CreateArticleInput,
  UpdateArticleInput,
  PaginatedResponse,
  ArticleSummary,
  toArticleSummary,
  ArticleStatus,
} from '../models';
import config from '../config';
import { logger, FileSystemError, NotFoundError, withRetry } from '../utils';

/**
 * File-based implementation of the Article Repository
 * 
 * Stores articles as individual JSON files for easy management
 * and human readability. Designed to be easily replaced with
 * a database implementation.
 */
export class FileArticleRepository implements IArticleRepository {
  private readonly articlesDir: string;
  private articlesCache: Map<string, Article> = new Map();
  private cacheInitialized: boolean = false;

  constructor() {
    this.articlesDir = config.storage.articlesPath;
  }

  /**
   * Initialize the repository (create directories if needed)
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.articlesDir, { recursive: true });
      logger.info('File article repository initialized', { path: this.articlesDir });
    } catch (error) {
      throw new FileSystemError('initialize repository', this.articlesDir, error as Error);
    }
  }

  /**
   * Load all articles into cache
   */
  private async loadCache(): Promise<void> {
    if (this.cacheInitialized) return;

    try {
      const files = await fs.readdir(this.articlesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.articlesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const article = JSON.parse(content) as Article;
          this.articlesCache.set(article.id, article);
        } catch (error) {
          logger.warn('Failed to load article file', { file, error: (error as Error).message });
        }
      }

      this.cacheInitialized = true;
      logger.info('Article cache loaded', { count: this.articlesCache.size });
    } catch (error) {
      throw new FileSystemError('load cache', this.articlesDir, error as Error);
    }
  }

  /**
   * Get file path for an article
   */
  private getFilePath(id: string): string {
    return path.join(this.articlesDir, `${id}.json`);
  }

  /**
   * Save article to file
   */
  private async saveToFile(article: Article): Promise<void> {
    const filePath = this.getFilePath(article.id);
    
    await withRetry(
      async () => {
        await fs.writeFile(filePath, JSON.stringify(article, null, 2), 'utf-8');
      },
      'save article to file',
      {
        maxAttempts: 3,
        shouldRetry: (error) => {
          // Retry on temporary file system errors
          const code = (error as NodeJS.ErrnoException).code;
          return code === 'EBUSY' || code === 'EAGAIN';
        },
      }
    );

    // Update cache
    this.articlesCache.set(article.id, article);
  }

  /**
   * Delete article file
   */
  private async deleteFile(id: string): Promise<void> {
    const filePath = this.getFilePath(id);
    
    await withRetry(
      async () => {
        await fs.unlink(filePath);
      },
      'delete article file',
      {
        maxAttempts: 3,
        shouldRetry: (error) => {
          const code = (error as NodeJS.ErrnoException).code;
          return code === 'EBUSY' || code === 'EAGAIN';
        },
      }
    );

    // Remove from cache
    this.articlesCache.delete(id);
  }

  async create(
    input: CreateArticleInput,
    authorId: string,
    authorName: string
  ): Promise<Article> {
    await this.loadCache();

    const now = new Date().toISOString();
    const article: Article = {
      id: uuidv4(),
      briefTitle: input.briefTitle,
      detailedDescription: input.detailedDescription,
      category: input.category,
      tags: input.tags || [],
      relatedArticles: input.relatedArticles || [],
      status: input.status || 'draft',
      authorId,
      authorName,
      createdAt: now,
      updatedAt: now,
      publishedAt: input.status === 'published' ? now : undefined,
      expirationDate: input.expirationDate,
      version: 1,
      metadata: {
        viewCount: 0,
        contentFormat: input.contentFormat || 'richtext',
      },
    };

    await this.saveToFile(article);
    logger.info('Article created', { articleId: article.id, authorId });

    return article;
  }

  async findById(id: string): Promise<Article | null> {
    await this.loadCache();

    // Try cache first
    if (this.articlesCache.has(id)) {
      return this.articlesCache.get(id) || null;
    }

    // Try loading from file
    try {
      const filePath = this.getFilePath(id);
      const content = await fs.readFile(filePath, 'utf-8');
      const article = JSON.parse(content) as Article;
      this.articlesCache.set(id, article);
      return article;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new FileSystemError('read article', id, error as Error);
    }
  }

  async update(id: string, input: UpdateArticleInput): Promise<Article> {
    const article = await this.findById(id);
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    const now = new Date().toISOString();
    const updatedArticle: Article = {
      ...article,
      ...input,
      updatedAt: now,
      version: article.version + 1,
      // Set publishedAt if transitioning to published
      publishedAt: input.status === 'published' && !article.publishedAt 
        ? now 
        : article.publishedAt,
    };

    await this.saveToFile(updatedArticle);
    logger.info('Article updated', { articleId: id, version: updatedArticle.version });

    return updatedArticle;
  }

  async softDelete(id: string): Promise<Article> {
    const article = await this.findById(id);
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    const deletedArticle = await this.update(id, { status: 'deleted' });
    logger.info('Article soft deleted', { articleId: id });

    return deletedArticle;
  }

  async hardDelete(id: string): Promise<void> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new NotFoundError('Article', id);
    }

    await this.deleteFile(id);
    logger.info('Article permanently deleted', { articleId: id });
  }

  async restore(id: string): Promise<Article> {
    const article = await this.findById(id);
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    if (article.status !== 'deleted') {
      throw new Error('Article is not deleted');
    }

    const restoredArticle = await this.update(id, { status: 'draft' });
    logger.info('Article restored', { articleId: id });

    return restoredArticle;
  }

  async search(
    params: ArticleSearchParams,
    userId: string,
    canViewAllDrafts: boolean
  ): Promise<PaginatedResponse<ArticleSummary>> {
    await this.loadCache();

    let articles = Array.from(this.articlesCache.values());

    // Apply filters
    articles = articles.filter(article => {
      // Status filter with permission check
      if (article.status === 'deleted') {
        return false; // Never show deleted articles in search
      }
      
      if (article.status === 'draft') {
        if (!canViewAllDrafts && article.authorId !== userId) {
          return false; // Can only see own drafts
        }
      }

      if (params.status) {
        const statuses = Array.isArray(params.status) ? params.status : [params.status];
        if (!statuses.includes(article.status)) {
          return false;
        }
      }

      // Category filter
      if (params.category && article.category !== params.category) {
        return false;
      }

      // Tags filter
      if (params.tags && params.tags.length > 0) {
        const hasAllTags = params.tags.every(tag => article.tags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      // Author filter
      if (params.authorId && article.authorId !== params.authorId) {
        return false;
      }

      // Date filters
      if (params.createdAfter && article.createdAt < params.createdAfter) {
        return false;
      }
      if (params.createdBefore && article.createdAt > params.createdBefore) {
        return false;
      }
      if (params.updatedAfter && article.updatedAt < params.updatedAfter) {
        return false;
      }
      if (params.updatedBefore && article.updatedAt > params.updatedBefore) {
        return false;
      }

      // Full-text search (simple implementation)
      if (params.query) {
        const query = params.query.toLowerCase();
        const searchableText = `${article.briefTitle} ${article.detailedDescription} ${article.tags.join(' ')}`.toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    const sortBy = params.sortBy || 'updatedAt';
    const sortOrder = params.sortOrder || 'desc';
    
    articles.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'briefTitle':
          comparison = a.briefTitle.localeCompare(b.briefTitle);
          break;
        case 'createdAt':
          comparison = a.createdAt.localeCompare(b.createdAt);
          break;
        case 'viewCount':
          comparison = a.metadata.viewCount - b.metadata.viewCount;
          break;
        case 'updatedAt':
        default:
          comparison = a.updatedAt.localeCompare(b.updatedAt);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedArticles = articles.slice(startIndex, endIndex);
    const totalItems = articles.length;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: paginatedArticles.map(toArticleSummary),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    await this.loadCache();
    return Array.from(this.articlesCache.values())
      .filter(a => a.authorId === authorId && a.status !== 'deleted');
  }

  async findByCategory(category: string): Promise<Article[]> {
    await this.loadCache();
    return Array.from(this.articlesCache.values())
      .filter(a => a.category === category && a.status !== 'deleted');
  }

  async findByTag(tag: string): Promise<Article[]> {
    await this.loadCache();
    return Array.from(this.articlesCache.values())
      .filter(a => a.tags.includes(tag) && a.status !== 'deleted');
  }

  async incrementViewCount(id: string, viewedBy?: string): Promise<void> {
    const article = await this.findById(id);
    if (!article) {
      throw new NotFoundError('Article', id);
    }

    article.metadata.viewCount += 1;
    if (viewedBy) {
      article.metadata.lastViewedBy = viewedBy;
      article.metadata.lastViewedAt = new Date().toISOString();
    }

    // Don't increment version for view count updates
    await fs.writeFile(
      this.getFilePath(id),
      JSON.stringify(article, null, 2),
      'utf-8'
    );
    this.articlesCache.set(id, article);
  }

  async getAllTags(): Promise<Array<{ name: string; count: number }>> {
    await this.loadCache();
    
    const tagCounts = new Map<string, number>();
    
    for (const article of this.articlesCache.values()) {
      if (article.status !== 'deleted') {
        for (const tag of article.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  async exists(id: string): Promise<boolean> {
    const article = await this.findById(id);
    return article !== null;
  }

  async getRelatedArticles(articleId: string, limit: number = 5): Promise<ArticleSummary[]> {
    const article = await this.findById(articleId);
    if (!article) {
      return [];
    }

    await this.loadCache();

    // Get explicitly related articles
    const relatedIds = new Set(article.relatedArticles);
    const related: Article[] = [];

    for (const relId of relatedIds) {
      const relArticle = this.articlesCache.get(relId);
      if (relArticle && relArticle.status === 'published') {
        related.push(relArticle);
      }
    }

    // If we need more, find articles with similar tags or category
    if (related.length < limit) {
      const remaining = limit - related.length;
      const candidates = Array.from(this.articlesCache.values())
        .filter(a => 
          a.id !== articleId &&
          a.status === 'published' &&
          !relatedIds.has(a.id) &&
          (a.category === article.category || 
           a.tags.some(t => article.tags.includes(t)))
        )
        .slice(0, remaining);
      
      related.push(...candidates);
    }

    return related.slice(0, limit).map(toArticleSummary);
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.articlesCache.clear();
    this.cacheInitialized = false;
  }
}

// Export singleton instance
export const fileArticleRepository = new FileArticleRepository();
