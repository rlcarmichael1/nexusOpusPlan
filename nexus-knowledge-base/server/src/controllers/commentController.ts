import { Response } from 'express';
import {
  AuthenticatedRequest,
  asyncHandler,
  validateUUID,
  validateBody,
} from '../middleware';
import { commentService } from '../services';
import { COMMENT_VALIDATION } from '../models';

/**
 * Comment Controller
 * 
 * Handles HTTP requests for article comment operations.
 */
export const commentController = {
  /**
   * Get comments for an article
   * GET /api/articles/:articleId/comments
   */
  list: [
    validateUUID('articleId'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const comments = await commentService.getByArticle(
        req.params.articleId,
        req.user
      );
      
      res.json({
        data: comments,
      });
    }),
  ],

  /**
   * Add a comment to an article
   * POST /api/articles/:articleId/comments
   */
  create: [
    validateUUID('articleId'),
    validateBody({
      content: {
        type: 'string',
        required: true,
        minLength: COMMENT_VALIDATION.CONTENT_MIN_LENGTH,
        maxLength: COMMENT_VALIDATION.CONTENT_MAX_LENGTH,
      },
    }),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const comment = await commentService.create(
        req.params.articleId,
        { content: req.body.content },
        req.user
      );
      
      res.status(201).json({
        message: 'Comment added successfully',
        data: comment,
      });
    }),
  ],

  /**
   * Update a comment
   * PUT /api/comments/:id
   */
  update: [
    validateUUID('id'),
    validateBody({
      content: {
        type: 'string',
        required: true,
        minLength: COMMENT_VALIDATION.CONTENT_MIN_LENGTH,
        maxLength: COMMENT_VALIDATION.CONTENT_MAX_LENGTH,
      },
    }),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const comment = await commentService.update(
        req.params.id,
        { content: req.body.content },
        req.user
      );
      
      res.json({
        message: 'Comment updated successfully',
        data: comment,
      });
    }),
  ],

  /**
   * Delete a comment
   * DELETE /api/comments/:id
   */
  delete: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      await commentService.delete(req.params.id, req.user);
      
      res.json({
        message: 'Comment deleted successfully',
      });
    }),
  ],
};
