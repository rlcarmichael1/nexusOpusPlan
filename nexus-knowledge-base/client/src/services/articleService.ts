import apiClient from './apiClient';
import {
  Article,
  ArticleSummary,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleSearchParams,
  PaginatedResponse,
  Tag,
} from '../types';

/**
 * Article Service
 * 
 * Handles all article-related API calls
 */
export const articleService = {
  /**
   * Search articles with filters and pagination
   */
  async search(params: ArticleSearchParams = {}): Promise<PaginatedResponse<ArticleSummary>> {
    const queryParams = new URLSearchParams();
    
    if (params.query) queryParams.append('query', params.query);
    if (params.status) {
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      statuses.forEach(s => queryParams.append('status', s));
    }
    if (params.category) queryParams.append('category', params.category);
    if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
    if (params.authorId) queryParams.append('authorId', params.authorId);
    if (params.createdAfter) queryParams.append('createdAfter', params.createdAfter);
    if (params.createdBefore) queryParams.append('createdBefore', params.createdBefore);
    if (params.updatedAfter) queryParams.append('updatedAfter', params.updatedAfter);
    if (params.updatedBefore) queryParams.append('updatedBefore', params.updatedBefore);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return apiClient.get<PaginatedResponse<ArticleSummary>>(
      `/articles${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get article by ID
   */
  async getById(id: string): Promise<{ data: Article }> {
    return apiClient.get<{ data: Article }>(`/articles/${id}`);
  },

  /**
   * Create a new article
   */
  async create(input: CreateArticleInput): Promise<{ message: string; data: Article }> {
    return apiClient.post<{ message: string; data: Article }>('/articles', input);
  },

  /**
   * Update an article
   */
  async update(
    id: string,
    input: UpdateArticleInput,
    changeReason?: string
  ): Promise<{ message: string; data: Article }> {
    const config = changeReason
      ? { headers: { 'X-Change-Reason': changeReason } }
      : undefined;
    
    return apiClient.put<{ message: string; data: Article }>(
      `/articles/${id}`,
      input,
      config
    );
  },

  /**
   * Delete an article (soft delete)
   */
  async delete(id: string): Promise<{ message: string; data: Article }> {
    return apiClient.delete<{ message: string; data: Article }>(`/articles/${id}`);
  },

  /**
   * Permanently delete an article
   */
  async permanentDelete(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/articles/${id}/permanent`);
  },

  /**
   * Restore a deleted article
   */
  async restore(id: string): Promise<{ message: string; data: Article }> {
    return apiClient.post<{ message: string; data: Article }>(`/articles/${id}/restore`);
  },

  /**
   * Publish a draft article
   */
  async publish(id: string): Promise<{ message: string; data: Article }> {
    return apiClient.post<{ message: string; data: Article }>(`/articles/${id}/publish`);
  },

  /**
   * Archive an article
   */
  async archive(id: string): Promise<{ message: string; data: Article }> {
    return apiClient.post<{ message: string; data: Article }>(`/articles/${id}/archive`);
  },

  /**
   * Get all tags
   */
  async getTags(): Promise<{ data: Tag[] }> {
    return apiClient.get<{ data: Tag[] }>('/articles/tags');
  },

  /**
   * Get related articles
   */
  async getRelated(id: string, limit?: number): Promise<{ data: ArticleSummary[] }> {
    const query = limit ? `?limit=${limit}` : '';
    return apiClient.get<{ data: ArticleSummary[] }>(`/articles/${id}/related${query}`);
  },
};

export default articleService;
