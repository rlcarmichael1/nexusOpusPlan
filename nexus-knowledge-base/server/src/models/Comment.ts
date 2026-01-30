/**
 * Comment on an article
 */
export interface Comment {
  id: string;
  articleId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
}

/**
 * Input for creating a new comment
 */
export interface CreateCommentInput {
  content: string;
}

/**
 * Input for updating an existing comment
 */
export interface UpdateCommentInput {
  content: string;
}

/**
 * Comment list response
 */
export interface CommentListResponse {
  articleId: string;
  comments: Comment[];
  totalCount: number;
}

/**
 * Validation constants for comments
 */
export const COMMENT_VALIDATION = {
  CONTENT_MIN_LENGTH: 1,
  CONTENT_MAX_LENGTH: 2000,
};
