/**
 * Article status types
 */
export type ArticleStatus = 'draft' | 'published' | 'archived' | 'deleted';

/**
 * Content format types
 */
export type ContentFormat = 'markdown' | 'richtext';

/**
 * Article metadata
 */
export interface ArticleMetadata {
  viewCount: number;
  contentFormat: ContentFormat;
  lastViewedAt?: string;
  lastViewedBy?: string;
}

/**
 * Full Article interface
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
 * Article summary for list views
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
 * Input for updating an article
 */
export interface UpdateArticleInput {
  briefTitle?: string;
  detailedDescription?: string;
  category?: string;
  tags?: string[];
  relatedArticles?: string[];
  expirationDate?: string;
}

/**
 * Search/filter parameters
 */
export interface ArticleSearchParams {
  query?: string;
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
 * Paginated response
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
 * Status display configuration
 */
export const STATUS_CONFIG: Record<ArticleStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bgColor: '#f3f4f6' },
  published: { label: 'Published', color: '#059669', bgColor: '#d1fae5' },
  archived: { label: 'Archived', color: '#d97706', bgColor: '#fef3c7' },
  deleted: { label: 'Deleted', color: '#dc2626', bgColor: '#fee2e2' },
};
