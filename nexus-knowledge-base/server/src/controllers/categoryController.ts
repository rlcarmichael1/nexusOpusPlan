import { Response } from 'express';
import {
  AuthenticatedRequest,
  asyncHandler,
  validateUUID,
  validateBody,
} from '../middleware';
import { fileCategoryRepository } from '../repositories';

/**
 * Category Controller
 * 
 * Handles HTTP requests for category operations.
 */
export const categoryController = {
  /**
   * Get all categories
   * GET /api/categories
   */
  list: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const categories = await fileCategoryRepository.findAll();
    
    res.json({
      data: categories,
    });
  }),

  /**
   * Get a single category
   * GET /api/categories/:id
   */
  get: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const category = await fileCategoryRepository.findById(req.params.id);
      
      if (!category) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        });
        return;
      }

      res.json({
        data: category,
      });
    }),
  ],

  /**
   * Create a new category (editors only)
   * POST /api/categories
   */
  create: [
    validateBody({
      name: { type: 'string', required: true, minLength: 1, maxLength: 50 },
      description: { type: 'string', maxLength: 200 },
      parentId: { type: 'string' },
    }),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Only editors can create categories
      if (req.user.role !== 'editor') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only editors can create categories',
          },
        });
        return;
      }

      try {
        const category = await fileCategoryRepository.create(
          req.body.name,
          req.body.description,
          req.body.parentId
        );
        
        res.status(201).json({
          message: 'Category created successfully',
          data: category,
        });
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: (error as Error).message,
            },
          });
          return;
        }
        throw error;
      }
    }),
  ],

  /**
   * Update a category (editors only)
   * PUT /api/categories/:id
   */
  update: [
    validateUUID('id'),
    validateBody({
      name: { type: 'string', minLength: 1, maxLength: 50 },
      description: { type: 'string', maxLength: 200 },
    }),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Only editors can update categories
      if (req.user.role !== 'editor') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only editors can update categories',
          },
        });
        return;
      }

      try {
        const category = await fileCategoryRepository.update(
          req.params.id,
          req.body.name,
          req.body.description
        );
        
        res.json({
          message: 'Category updated successfully',
          data: category,
        });
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: (error as Error).message,
            },
          });
          return;
        }
        throw error;
      }
    }),
  ],

  /**
   * Delete a category (editors only)
   * DELETE /api/categories/:id
   */
  delete: [
    validateUUID('id'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Only editors can delete categories
      if (req.user.role !== 'editor') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only editors can delete categories',
          },
        });
        return;
      }

      try {
        await fileCategoryRepository.delete(req.params.id);
        
        res.json({
          message: 'Category deleted successfully',
        });
      } catch (error) {
        if ((error as Error).message.includes('has') && (error as Error).message.includes('articles')) {
          res.status(400).json({
            error: {
              code: 'BAD_REQUEST',
              message: (error as Error).message,
            },
          });
          return;
        }
        throw error;
      }
    }),
  ],
};
