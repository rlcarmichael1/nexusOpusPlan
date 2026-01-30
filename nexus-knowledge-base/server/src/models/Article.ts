/**
 * Article status represents the lifecycle state of an article
 */
export type ArticleStatus = 'draft' | 'published' | 'archived' | 'deleted';

/**
 * Content format for the article body
 */
export type ContentFormat = 'markdown' | 'richtext';

/**
 * Article metadata for analytics and configuration
 */
export interface ArticleMetadata {
  viewCount: number;
  contentFormat: ContentFormat;
  lastViewedAt?: string;
  lastViewedBy?: string;
}

/**
 * Main Article interface
 */
export interface Article {
  id: string;
  briefTitle: string;
  detailedDescription: string;
  category: string;
  tags: string[];
  relatedArticles: string[];
  status: ArticleStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  expirationDate?: string;
  version: number;
  lockedBy?: string;
  lockedByName?: string;
  lockedAt?: string;
  metadata: ArticleMetadata;
}

/**
 * Input for creating a new article
 */
export interface CreateArticleInput {
  briefTitle: string;
  detailedDescription: string;
  category: string;
  tags?: string[];
  relatedArticles?: string[];
  status?: ArticleStatus;
  expirationDate?: string;
  contentFormat?: ContentFormat;
}

/**
 * Input for updating an existing article
 */
export interface UpdateArticleInput {
  briefTitle?: string;
  detailedDescription?: string;
  category?: string;
  tags?: string[];
  relatedArticles?: string[];
  status?: ArticleStatus;
  expirationDate?: string;
}

/**
 * Article search/filter parameters
 */
export interface ArticleSearchParams {
  query?: string;           // Full-text search
  status?: ArticleStatus | ArticleStatus[];
  category?: string;
  tags?: string[];
  authorId?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'briefTitle' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Article summary for list views (excludes full content)
 */
export interface ArticleSummary {
  id: string;
  briefTitle: string;
  category: string;
  tags: string[];
  status: ArticleStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  viewCount: number;
  isLocked: boolean;
  lockedByName?: string;
}

/**
 * Convert full article to summary
 */
export function toArticleSummary(article: Article): ArticleSummary {
  return {
    id: article.id,
    briefTitle: article.briefTitle,
    category: article.category,
    tags: article.tags,
    status: article.status,
    authorId: article.authorId,
    authorName: article.authorName,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    publishedAt: article.publishedAt,
    viewCount: article.metadata.viewCount,
    isLocked: !!article.lockedBy,
    lockedByName: article.lockedByName,
  };
}

/**
 * Validation constants
 */
export const ARTICLE_VALIDATION = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 150,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 50000,
  CATEGORY_MAX_LENGTH: 50,
  TAG_MAX_LENGTH: 30,
  MAX_TAGS: 10,
  MAX_RELATED_ARTICLES: 10,
};
