import { Response } from 'express';
import {
  AuthenticatedRequest,
  asyncHandler,
  validateBody,
  validateQuery,
  validateUUID,
} from '../middleware';
import { articleService } from '../services';
import {
  CreateArticleInput,
  UpdateArticleInput,
  ArticleSearchParams,
  ARTICLE_VALIDATION,
} from '../models';

/**
 * Article Controller
 * 
 * Handles HTTP requests for article operations.
 * Delegates business logic to ArticleService.
 */
export const articleController = {
  /**
   * Create a new article
   * POST /api/articles
   */
  create: [
    validateBody({
      briefTitle: {
        type: 'string',
        required: true,
        minLength: ARTICLE_VALIDATION.TITLE_MIN_LENGTH,
        maxLength: ARTICLE_VALIDATION.TITLE_MAX_LENGTH,
      },
      detailedDescription: {
        type: 'string',
        required: true,
        minLength: ARTICLE_VALIDATION.DESCRIPTION_MIN_LENGTH,
        maxLength: ARTICLE_VALIDATION.DESCRIPTION_MAX_LENGTH,
      },
      category: {
        type: 'string',
        required: true,
        maxLength: ARTICLE_VALIDATION.CATEGORY_MAX_LENGTH,
      },
      tags: { type: 'array' },
      relatedArticles: { type: 'array' },
      status: { type: 'string', enum: ['draft', 'published'] },
      expirationDate: { type: 'string' },
      contentFormat: { type: 'string', enum: ['markdown', 'richtext'] },
    }),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const input: CreateArticleInput = req.body;
      const article = await articleService.create(input, req.user);
      
      res.status(201).json({
        message: 'Article created successfully',
        data: article,
      });
    }),
  ],

  /**
   * Get article by ID
   * GET /api/articles/:id
   */
  getById: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const article = await articleService.getById(req.params.id, req.user);
      
      res.json({
        data: article,
      });
    }),
  ],

  /**
   * Update an article
   * PUT /api/articles/:id
   */
  update: [
    validateUUID('id'),
    validateBody({
      briefTitle: {
        type: 'string',
        minLength: ARTICLE_VALIDATION.TITLE_MIN_LENGTH,
        maxLength: ARTICLE_VALIDATION.TITLE_MAX_LENGTH,
      },
      detailedDescription: {
        type: 'string',
        minLength: ARTICLE_VALIDATION.DESCRIPTION_MIN_LENGTH,
        maxLength: ARTICLE_VALIDATION.DESCRIPTION_MAX_LENGTH,
      },
      category: {
        type: 'string',
        maxLength: ARTICLE_VALIDATION.CATEGORY_MAX_LENGTH,
      },
      tags: { type: 'array' },
      relatedArticles: { type: 'array' },
      expirationDate: { type: 'string' },
    }),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const input: UpdateArticleInput = req.body;
      const changeReason = req.headers['x-change-reason'] as string | undefined;
      
      const article = await articleService.update(
        req.params.id,
        input,
        req.user,
        changeReason
      );
      
      res.json({
        message: 'Article updated successfully',
        data: article,
      });
    }),
  ],

  /**
   * Delete an article (soft delete)
   * DELETE /api/articles/:id
   */
  delete: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const article = await articleService.delete(req.params.id, req.user);
      
      res.json({
        message: 'Article moved to trash',
        data: article,
      });
    }),
  ],

  /**
   * Permanently delete an article
   * DELETE /api/articles/:id/permanent
   */
  permanentDelete: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      await articleService.permanentDelete(req.params.id, req.user);
      
      res.json({
        message: 'Article permanently deleted',
      });
    }),
  ],

  /**
   * Restore a deleted article
   * POST /api/articles/:id/restore
   */
  restore: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const article = await articleService.restore(req.params.id, req.user);
      
      res.json({
        message: 'Article restored successfully',
        data: article,
      });
    }),
  ],

  /**
   * Publish a draft article
   * POST /api/articles/:id/publish
   */
  publish: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const article = await articleService.publish(req.params.id, req.user);
      
      res.json({
        message: 'Article published successfully',
        data: article,
      });
    }),
  ],

  /**
   * Archive a published article
   * POST /api/articles/:id/archive
   */
  archive: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const article = await articleService.archive(req.params.id, req.user);
      
      res.json({
        message: 'Article archived successfully',
        data: article,
      });
    }),
  ],

  /**
   * Search articles
   * GET /api/articles
   */
  search: [
    validateQuery({
      query: { type: 'string' },
      status: { type: 'string' },
      category: { type: 'string' },
      tags: { type: 'array' },
      authorId: { type: 'string' },
      createdAfter: { type: 'string' },
      createdBefore: { type: 'string' },
      updatedAfter: { type: 'string' },
      updatedBefore: { type: 'string' },
      sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'briefTitle', 'viewCount'] },
      sortOrder: { type: 'string', enum: ['asc', 'desc'] },
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 },
    }),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const params: ArticleSearchParams = {
        query: req.query.query as string,
        status: req.query.status as ArticleSearchParams['status'],
        category: req.query.category as string,
        tags: req.query.tags as string[],
        authorId: req.query.authorId as string,
        createdAfter: req.query.createdAfter as string,
        createdBefore: req.query.createdBefore as string,
        updatedAfter: req.query.updatedAfter as string,
        updatedBefore: req.query.updatedBefore as string,
        sortBy: req.query.sortBy as ArticleSearchParams['sortBy'],
        sortOrder: req.query.sortOrder as ArticleSearchParams['sortOrder'],
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
      };

      const result = await articleService.search(params, req.user);
      
      res.json(result);
    }),
  ],

  /**
   * Get all tags
   * GET /api/articles/tags
   */
  getTags: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const tags = await articleService.getAllTags();
    
    res.json({
      data: tags,
    });
  }),

  /**
   * Get related articles
   * GET /api/articles/:id/related
   */
  getRelated: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const limit = parseInt(req.query.limit as string) || 5;
      const related = await articleService.getRelatedArticles(req.params.id, limit);
      
      res.json({
        data: related,
      });
    }),
  ],
};
