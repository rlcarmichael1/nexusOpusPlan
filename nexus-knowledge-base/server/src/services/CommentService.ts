import {
  Comment,
  CreateCommentInput,
  UpdateCommentInput,
  CommentListResponse,
  User,
  hasPermission,
  COMMENT_VALIDATION,
} from '../models';
import {
  ICommentRepository,
  IArticleRepository,
  fileCommentRepository,
  fileArticleRepository,
} from '../repositories';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  logger,
} from '../utils';

/**
 * Comment Service
 * 
 * Handles business logic for article comments.
 */
export class CommentService {
  constructor(
    private commentRepository: ICommentRepository = fileCommentRepository,
    private articleRepository: IArticleRepository = fileArticleRepository
  ) {}

  /**
   * Validate comment input
   */
  private validateCommentInput(input: CreateCommentInput | UpdateCommentInput): void {
    const errors: Record<string, string[]> = {};

    if (!input.content || input.content.trim().length === 0) {
      errors.content = ['Comment content is required'];
    } else if (input.content.length < COMMENT_VALIDATION.CONTENT_MIN_LENGTH) {
      errors.content = [`Comment must be at least ${COMMENT_VALIDATION.CONTENT_MIN_LENGTH} character`];
    } else if (input.content.length > COMMENT_VALIDATION.CONTENT_MAX_LENGTH) {
      errors.content = [`Comment must not exceed ${COMMENT_VALIDATION.CONTENT_MAX_LENGTH} characters`];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }
  }

  /**
   * Add a comment to an article
   */
  async create(articleId: string, input: CreateCommentInput, user: User): Promise<Comment> {
    // Check permission
    if (!hasPermission(user, 'comment:create')) {
      throw new ForbiddenError('You do not have permission to add comments');
    }

    // Check if article exists
    const article = await this.articleRepository.findById(articleId);
    if (!article) {
      throw new NotFoundError('Article', articleId);
    }

    // Only allow comments on published articles
    if (article.status !== 'published') {
      throw new ForbiddenError('Comments can only be added to published articles');
    }

    // Validate input
    this.validateCommentInput(input);

    // Create comment
    const comment = await this.commentRepository.create(
      articleId,
      { content: input.content.trim() },
      user.id,
      user.displayName
    );

    logger.info('Comment created', { commentId: comment.id, articleId, userId: user.id });
    return comment;
  }

  /**
   * Get comments for an article
   */
  async getByArticle(articleId: string, user: User): Promise<CommentListResponse> {
    // Check permission
    if (!hasPermission(user, 'comment:view')) {
      throw new ForbiddenError('You do not have permission to view comments');
    }

    // Check if article exists
    const exists = await this.articleRepository.exists(articleId);
    if (!exists) {
      throw new NotFoundError('Article', articleId);
    }

    return this.commentRepository.findByArticle(articleId);
  }

  /**
   * Update a comment
   */
  async update(commentId: string, input: UpdateCommentInput, user: User): Promise<Comment> {
    // Get the comment
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment', commentId);
    }

    // Check permission
    const canEditOwn = hasPermission(user, 'comment:edit:own') && comment.authorId === user.id;
    const canEditAll = hasPermission(user, 'comment:edit:all');
    
    if (!canEditOwn && !canEditAll) {
      throw new ForbiddenError('You do not have permission to edit this comment');
    }

    // Validate input
    this.validateCommentInput(input);

    // Update comment
    const updatedComment = await this.commentRepository.update(commentId, {
      content: input.content.trim(),
    });

    logger.info('Comment updated', { commentId, userId: user.id });
    return updatedComment;
  }

  /**
   * Delete a comment
   */
  async delete(commentId: string, user: User): Promise<void> {
    // Get the comment
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundError('Comment', commentId);
    }

    // Check permission
    const canDeleteOwn = hasPermission(user, 'comment:delete:own') && comment.authorId === user.id;
    const canDeleteAll = hasPermission(user, 'comment:delete:all');
    
    if (!canDeleteOwn && !canDeleteAll) {
      throw new ForbiddenError('You do not have permission to delete this comment');
    }

    await this.commentRepository.delete(commentId);
    logger.info('Comment deleted', { commentId, userId: user.id });
  }
}

// Export singleton instance
export const commentService = new CommentService();
