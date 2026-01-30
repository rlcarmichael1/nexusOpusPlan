import { Router } from 'express';
import { commentController } from '../controllers';
import { authMiddleware, requireRole } from '../middleware';

const router = Router({ mergeParams: true });

// Apply authentication to all comment routes
router.use(authMiddleware);

/**
 * Comment Routes
 * 
 * Article comments (nested under /api/articles/:articleId/comments):
 * GET  /api/articles/:articleId/comments - List comments for article
 * POST /api/articles/:articleId/comments - Add comment to article
 * 
 * Comment management (standalone at /api/comments):
 * PUT    /api/comments/:id - Update a comment
 * DELETE /api/comments/:id - Delete a comment
 */

// List comments for article (all authenticated users)
router.get('/', commentController.list);

// Add comment (actors, authors, editors)
router.post('/', requireRole('actor'), commentController.create);

export default router;


/**
 * Standalone comment routes for update/delete
 */
export const commentManagementRouter = Router();

commentManagementRouter.use(authMiddleware);

// Update comment (actors, authors, editors - with ownership check in service)
commentManagementRouter.put('/:id', requireRole('actor'), commentController.update);

// Delete comment (actors, authors, editors - with ownership check in service)
commentManagementRouter.delete('/:id', requireRole('actor'), commentController.delete);
