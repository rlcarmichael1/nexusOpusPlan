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
 * Create comment input
 */
export interface CreateCommentInput {
  content: string;
}

/**
 * Update comment input
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
