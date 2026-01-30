import { Router } from 'express';
import { categoryController } from '../controllers';
import { authMiddleware } from '../middleware';

const router = Router();

// Apply authentication to all category routes
router.use(authMiddleware);

/**
 * Category Routes
 * 
 * GET    /api/categories     - List all categories
 * POST   /api/categories     - Create new category (editors only)
 * GET    /api/categories/:id - Get single category
 * PUT    /api/categories/:id - Update category (editors only)
 * DELETE /api/categories/:id - Delete category (editors only)
 */

// List categories (all authenticated users)
router.get('/', categoryController.list);

// Create category (editors only - checked in controller)
router.post('/', categoryController.create);

// Get single category
router.get('/:id', categoryController.get);

// Update category (editors only - checked in controller)
router.put('/:id', categoryController.update);

// Delete category (editors only - checked in controller)
router.delete('/:id', categoryController.delete);

export default router;
