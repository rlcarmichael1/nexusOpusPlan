import { Response } from 'express';
import {
  AuthenticatedRequest,
  asyncHandler,
  getMockUsers,
  switchMockUserHandler,
} from '../middleware';
import config from '../config';

/**
 * Auth Controller
 * 
 * Handles authentication-related endpoints.
 * In development, provides mock user management.
 * In production, would integrate with SSO/OAuth.
 */
export const authController = {
  /**
   * Get current user info
   * GET /api/auth/me
   */
  me: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      data: {
        user: req.user,
        permissions: req.user ? getPermissionsForUser(req.user) : [],
      },
    });
  }),

  /**
   * Get available roles (development only)
   * GET /api/auth/roles
   */
  roles: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    if (config.server.isProduction) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      return;
    }

    const users = getMockUsers();
    res.json({
      data: users.map(u => ({
        id: u.id,
        displayName: u.displayName,
        role: u.role,
      })),
    });
  }),

  /**
   * Switch mock user role (development only)
   * POST /api/auth/switch-role
   */
  switchRole: switchMockUserHandler,
};

/**
 * Get permissions summary for a user
 */
function getPermissionsForUser(user: AuthenticatedRequest['user']): string[] {
  const basePermissions = ['view:published', 'search:basic'];
  
  switch (user.role) {
    case 'reader':
      return [...basePermissions, 'version:view'];
    
    case 'actor':
      return [
        ...basePermissions,
        'version:view',
        'comment:create',
        'comment:edit:own',
        'comment:delete:own',
      ];
    
    case 'author':
      return [
        ...basePermissions,
        'version:view',
        'version:restore:own',
        'comment:create',
        'comment:edit:own',
        'comment:delete:own',
        'article:create',
        'article:edit:own',
        'article:delete:own',
        'article:publish:own',
        'article:restore:own',
        'search:advanced',
      ];
    
    case 'editor':
      return [
        ...basePermissions,
        'version:view',
        'version:restore:all',
        'comment:create',
        'comment:edit:all',
        'comment:delete:all',
        'article:create',
        'article:edit:all',
        'article:delete:all',
        'article:publish:all',
        'article:archive',
        'article:restore:all',
        'search:advanced',
      ];
    
    default:
      return basePermissions;
  }
}
