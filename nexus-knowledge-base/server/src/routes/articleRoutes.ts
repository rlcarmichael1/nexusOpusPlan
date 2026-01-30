import { Router } from 'express';
import { articleController } from '../controllers';
import { authMiddleware, requireRole } from '../middleware';

const router = Router();

// Apply authentication to all article routes
router.use(authMiddleware);

/**
 * Article Routes
 * 
 * GET    /api/articles            - Search/list articles
 * GET    /api/articles/tags       - Get all tags
 * POST   /api/articles            - Create new article
 * GET    /api/articles/:id        - Get article by ID
 * PUT    /api/articles/:id        - Update article
 * DELETE /api/articles/:id        - Soft delete article
 * DELETE /api/articles/:id/permanent - Permanently delete article
 * POST   /api/articles/:id/restore   - Restore deleted article
 * POST   /api/articles/:id/publish   - Publish draft article
 * POST   /api/articles/:id/archive   - Archive published article
 * GET    /api/articles/:id/related   - Get related articles
 */

// List/search articles (all authenticated users)
router.get('/', articleController.search);

// Get all tags (all authenticated users)
router.get('/tags', articleController.getTags);

// Create article (authors and editors)
router.post('/', requireRole('author'), articleController.create);

// Get single article
router.get('/:id', articleController.getById);

// Update article (authors and editors, with ownership check in service)
router.put('/:id', requireRole('author'), articleController.update);

// Soft delete article (authors and editors, with ownership check in service)
router.delete('/:id', requireRole('author'), articleController.delete);

// Permanent delete (editors only)
router.delete('/:id/permanent', requireRole('editor'), articleController.permanentDelete);

// Restore from trash
router.post('/:id/restore', requireRole('author'), articleController.restore);

// Publish draft
router.post('/:id/publish', requireRole('author'), articleController.publish);

// Archive (editors only)
router.post('/:id/archive', requireRole('editor'), articleController.archive);

// Get related articles
router.get('/:id/related', articleController.getRelated);

export default router;
