import apiClient from './apiClient';
import { Comment, CreateCommentInput, UpdateCommentInput, CommentListResponse } from '../types';

/**
 * Comment Service
 * 
 * Handles comment-related API calls
 */
export const commentService = {
  /**
   * Get comments for an article
   */
  async getByArticle(articleId: string): Promise<{ data: CommentListResponse }> {
    return apiClient.get<{ data: CommentListResponse }>(`/articles/${articleId}/comments`);
  },

  /**
   * Add a comment to an article
   */
  async create(
    articleId: string,
    input: CreateCommentInput
  ): Promise<{ message: string; data: Comment }> {
    return apiClient.post<{ message: string; data: Comment }>(
      `/articles/${articleId}/comments`,
      input
    );
  },

  /**
   * Update a comment
   */
  async update(
    commentId: string,
    input: UpdateCommentInput
  ): Promise<{ message: string; data: Comment }> {
    return apiClient.put<{ message: string; data: Comment }>(`/comments/${commentId}`, input);
  },

  /**
   * Delete a comment
   */
  async delete(commentId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/comments/${commentId}`);
  },
};

export default commentService;
