import { Router } from 'express';

import articleRoutes from './articleRoutes';
import lockRoutes from './lockRoutes';
import versionRoutes from './versionRoutes';
import commentRoutes, { commentManagementRouter } from './commentRoutes';
import authRoutes from './authRoutes';
import categoryRoutes from './categoryRoutes';

const router = Router();

/**
 * API Routes
 * 
 * /api/auth         - Authentication
 * /api/articles     - Article CRUD
 * /api/categories   - Category management
 * /api/comments     - Comment management
 * 
 * Nested routes:
 * /api/articles/:id/lock     - Article locking
 * /api/articles/:id/versions - Version history
 * /api/articles/:articleId/comments - Article comments
 */

// Auth routes
router.use('/auth', authRoutes);

// Article routes
router.use('/articles', articleRoutes);

// Nested article routes
router.use('/articles/:id/lock', lockRoutes);
router.use('/articles/:id/versions', versionRoutes);
router.use('/articles/:articleId/comments', commentRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// Standalone comment routes (for update/delete by comment ID)
router.use('/comments', commentManagementRouter);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
