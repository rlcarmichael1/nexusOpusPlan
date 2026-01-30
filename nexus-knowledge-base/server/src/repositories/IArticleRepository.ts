import {
  Article,
  ArticleSearchParams,
  CreateArticleInput,
  UpdateArticleInput,
  PaginatedResponse,
  ArticleSummary,
} from '../models';

/**
 * Article Repository Interface
 * 
 * This interface defines the contract for article data access.
 * By programming to this interface, the application can easily switch
 * between different storage backends (flat files, databases, etc.)
 * without changing the business logic.
 */
export interface IArticleRepository {
  /**
   * Create a new article
   * @param input Article creation data
   * @param authorId ID of the user creating the article
   * @param authorName Display name of the author
   * @returns The created article
   */
  create(input: CreateArticleInput, authorId: string, authorName: string): Promise<Article>;

  /**
   * Find an article by ID
   * @param id Article ID
   * @returns The article or null if not found
   */
  findById(id: string): Promise<Article | null>;

  /**
   * Update an existing article
   * @param id Article ID
   * @param input Update data
   * @returns The updated article
   */
  update(id: string, input: UpdateArticleInput): Promise<Article>;

  /**
   * Soft delete an article (move to trash)
   * @param id Article ID
   * @returns The deleted article
   */
  softDelete(id: string): Promise<Article>;

  /**
   * Permanently delete an article
   * @param id Article ID
   */
  hardDelete(id: string): Promise<void>;

  /**
   * Restore a soft-deleted article
   * @param id Article ID
   * @returns The restored article
   */
  restore(id: string): Promise<Article>;

  /**
   * Search and filter articles with pagination
   * @param params Search parameters
   * @param userId Current user ID (for permission filtering)
   * @param canViewAllDrafts Whether user can view all drafts
   * @returns Paginated article summaries
   */
  search(
    params: ArticleSearchParams,
    userId: string,
    canViewAllDrafts: boolean
  ): Promise<PaginatedResponse<ArticleSummary>>;

  /**
   * Get all articles by a specific author
   * @param authorId Author's user ID
   * @returns Array of articles
   */
  findByAuthor(authorId: string): Promise<Article[]>;

  /**
   * Get articles by category
   * @param category Category name
   * @returns Array of articles
   */
  findByCategory(category: string): Promise<Article[]>;

  /**
   * Get articles by tag
   * @param tag Tag name
   * @returns Array of articles
   */
  findByTag(tag: string): Promise<Article[]>;

  /**
   * Increment view count
   * @param id Article ID
   * @param viewedBy User ID who viewed
   */
  incrementViewCount(id: string, viewedBy?: string): Promise<void>;

  /**
   * Get all unique tags used across articles
   * @returns Array of tag names with counts
   */
  getAllTags(): Promise<Array<{ name: string; count: number }>>;

  /**
   * Check if an article exists
   * @param id Article ID
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get related articles
   * @param articleId Article ID
   * @param limit Maximum number of related articles
   */
  getRelatedArticles(articleId: string, limit?: number): Promise<ArticleSummary[]>;
}
