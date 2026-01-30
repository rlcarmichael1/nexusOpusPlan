import { Router } from 'express';
import { authController } from '../controllers';
import { authMiddleware } from '../middleware';

const router = Router();

/**
 * Auth Routes
 * 
 * GET  /api/auth/me          - Get current user info
 * GET  /api/auth/roles       - Get available roles (dev only)
 * POST /api/auth/switch-role - Switch mock user role (dev only)
 */

// Get current user (requires auth)
router.get('/me', authMiddleware, authController.me);

// Development-only routes
router.get('/roles', authController.roles);
router.post('/switch-role', authController.switchRole);

export default router;
