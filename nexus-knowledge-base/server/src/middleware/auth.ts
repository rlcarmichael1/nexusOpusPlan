import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { User, UserRole, ROLE_HIERARCHY } from '../models';
import { UnauthorizedError, logger } from '../utils';

/**
 * Extended Express Request with user information
 */
export interface AuthenticatedRequest extends Request {
  user: User;
  correlationId: string;
}

/**
 * Mock users for development and testing
 * In production, this would be replaced with actual authentication
 */
const MOCK_USERS: Record<string, User> = {
  'reader-user': {
    id: 'reader-001',
    email: 'reader@example.com',
    displayName: 'Reader User',
    role: 'reader',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  'actor-user': {
    id: 'actor-001',
    email: 'actor@example.com',
    displayName: 'Actor User',
    role: 'actor',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  'author-user': {
    id: 'author-001',
    email: 'author@example.com',
    displayName: 'Author User',
    role: 'author',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  'editor-user': {
    id: 'editor-001',
    email: 'editor@example.com',
    displayName: 'Editor User',
    role: 'editor',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
};

// Current mock user session (for development)
let currentMockUserId: string = 'author-user';

/**
 * Set the current mock user (for development role switching)
 */
export function setMockUser(userId: string): User | null {
  if (MOCK_USERS[userId]) {
    currentMockUserId = userId;
    return MOCK_USERS[userId];
  }
  return null;
}

/**
 * Get all available mock users
 */
export function getMockUsers(): User[] {
  return Object.values(MOCK_USERS);
}

/**
 * Get the current mock user
 */
export function getCurrentMockUser(): User {
  return MOCK_USERS[currentMockUserId];
}

/**
 * Authentication Middleware
 * 
 * In development mode, uses mock users with role switching capability.
 * In production, this should be replaced with actual authentication
 * (e.g., JWT validation, OAuth, SAML, etc.)
 * 
 * Integration hooks for future SSO:
 * - Check for Authorization header with Bearer token
 * - Validate token with identity provider
 * - Extract user claims and map to User interface
 * - Support for refresh tokens
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Add correlation ID for request tracing
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as AuthenticatedRequest).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  // Check for Authorization header
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Future: Validate JWT or OAuth token here
    // For now, support mock user selection via header
    const match = authHeader.match(/^Bearer\s+mock:(.+)$/);
    if (match) {
      const mockUserId = match[1];
      if (MOCK_USERS[mockUserId]) {
        (req as AuthenticatedRequest).user = MOCK_USERS[mockUserId];
        logger.debug('Mock user authenticated via header', { 
          userId: mockUserId,
          correlationId 
        });
        return next();
      }
    }

    // Future production authentication would go here:
    // try {
    //   const token = authHeader.replace('Bearer ', '');
    //   const decoded = await validateToken(token);
    //   (req as AuthenticatedRequest).user = mapClaimsToUser(decoded);
    //   return next();
    // } catch (error) {
    //   throw new UnauthorizedError('Invalid token');
    // }
  }

  // Check for mock user cookie (for browser-based role switching)
  const mockUserCookie = req.cookies?.mockUser;
  if (mockUserCookie && MOCK_USERS[mockUserCookie]) {
    (req as AuthenticatedRequest).user = MOCK_USERS[mockUserCookie];
    logger.debug('Mock user authenticated via cookie', { 
      userId: mockUserCookie,
      correlationId 
    });
    return next();
  }

  // Default to current mock user in development
  if (process.env.NODE_ENV !== 'production') {
    (req as AuthenticatedRequest).user = getCurrentMockUser();
    logger.debug('Using default mock user', { 
      userId: currentMockUserId,
      correlationId 
    });
    return next();
  }

  // In production without valid auth, reject
  throw new UnauthorizedError('Authentication required');
}

/**
 * Optional authentication - allows unauthenticated access but attaches user if available
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    authMiddleware(req, res, next);
  } catch (error) {
    // Allow request to continue without user
    (req as AuthenticatedRequest).correlationId = uuidv4();
    next();
  }
}

/**
 * Role-based Access Control Middleware Factory
 * 
 * Creates middleware that checks if the authenticated user
 * has at least the minimum required role.
 */
export function requireRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
    const requiredRoleIndex = ROLE_HIERARCHY.indexOf(minimumRole);

    if (userRoleIndex < requiredRoleIndex) {
      logger.warn('Access denied - insufficient role', {
        userId: user.id,
        userRole: user.role,
        requiredRole: minimumRole,
        correlationId: (req as AuthenticatedRequest).correlationId,
      });
      
      throw new UnauthorizedError(
        `This action requires ${minimumRole} role or higher`
      );
    }

    next();
  };
}

/**
 * Dev-only endpoint handler for switching mock users
 */
export function switchMockUserHandler(
  req: Request,
  res: Response
): void {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { userId, role } = req.body;

  // Switch by user ID
  if (userId && MOCK_USERS[userId]) {
    setMockUser(userId);
    res.json({ 
      message: 'User switched successfully',
      user: MOCK_USERS[userId]
    });
    return;
  }

  // Switch by role
  if (role) {
    const userEntry = Object.entries(MOCK_USERS).find(
      ([, user]) => user.role === role
    );
    
    if (userEntry) {
      setMockUser(userEntry[0]);
      res.json({ 
        message: 'User switched successfully',
        user: userEntry[1]
      });
      return;
    }
  }

  res.status(400).json({ 
    error: 'Invalid user ID or role',
    availableUsers: Object.keys(MOCK_USERS),
    availableRoles: ROLE_HIERARCHY,
  });
}
