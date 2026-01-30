import { Router } from 'express';
import { versionController } from '../controllers';
import { authMiddleware, requireRole } from '../middleware';

const router = Router({ mergeParams: true });

// Apply authentication to all version routes
router.use(authMiddleware);

/**
 * Version Routes (nested under /api/articles/:id/versions)
 * 
 * GET  /api/articles/:id/versions              - List version history
 * GET  /api/articles/:id/versions/compare      - Compare two versions
 * GET  /api/articles/:id/versions/:version     - Get specific version
 * POST /api/articles/:id/versions/:version/restore - Restore to version
 */

// List versions (all authenticated users)
router.get('/', versionController.list);

// Compare versions (all authenticated users)
router.get('/compare', versionController.compare);

// Get specific version (all authenticated users)
router.get('/:version', versionController.get);

// Restore version (authors and editors)
router.post('/:version/restore', requireRole('author'), versionController.restore);

export default router;
