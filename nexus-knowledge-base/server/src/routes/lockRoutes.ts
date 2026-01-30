import { Router } from 'express';
import { lockController } from '../controllers';
import { authMiddleware, requireRole } from '../middleware';

const router = Router({ mergeParams: true });

// Apply authentication to all lock routes
router.use(authMiddleware);

/**
 * Lock Routes (nested under /api/articles/:id/lock)
 * 
 * GET    /api/articles/:id/lock   - Get lock status
 * POST   /api/articles/:id/lock   - Acquire lock
 * PUT    /api/articles/:id/lock   - Renew lock
 * DELETE /api/articles/:id/lock   - Release lock
 */

// Get lock status (all authenticated users)
router.get('/', lockController.status);

// Acquire lock (authors and editors)
router.post('/', requireRole('author'), lockController.acquire);

// Renew lock (authors and editors)
router.put('/', requireRole('author'), lockController.renew);

// Release lock (authors and editors)
router.delete('/', requireRole('author'), lockController.release);

export default router;
