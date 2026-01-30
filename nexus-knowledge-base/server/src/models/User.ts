/**
 * User role types for RBAC
 * Ordered by permission level (lowest to highest)
 */
export type UserRole = 'reader' | 'actor' | 'author' | 'editor';

/**
 * User interface representing an authenticated user
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
}

/**
 * Input for updating an existing user
 */
export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  role?: UserRole;
  avatarUrl?: string;
}

/**
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */
export const ROLE_HIERARCHY: UserRole[] = ['reader', 'actor', 'author', 'editor'];

/**
 * Check if a role has at least the required permission level
 * @param userRole The user's current role
 * @param requiredRole The minimum required role
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Permission types for fine-grained access control
 */
export type Permission =
  | 'article:view:published'
  | 'article:view:draft:own'
  | 'article:view:draft:all'
  | 'article:create'
  | 'article:edit:own'
  | 'article:edit:all'
  | 'article:delete:own'
  | 'article:delete:all'
  | 'article:publish:own'
  | 'article:publish:all'
  | 'article:archive'
  | 'article:restore:own'
  | 'article:restore:all'
  | 'article:version:view'
  | 'article:version:restore:own'
  | 'article:version:restore:all'
  | 'comment:view'
  | 'comment:create'
  | 'comment:edit:own'
  | 'comment:edit:all'
  | 'comment:delete:own'
  | 'comment:delete:all'
  | 'search:basic'
  | 'search:advanced';

/**
 * Role-permission mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  reader: [
    'article:view:published',
    'article:version:view',
    'comment:view',
    'search:basic',
  ],
  actor: [
    'article:view:published',
    'article:version:view',
    'comment:view',
    'comment:create',
    'comment:edit:own',
    'comment:delete:own',
    'search:basic',
  ],
  author: [
    'article:view:published',
    'article:view:draft:own',
    'article:create',
    'article:edit:own',
    'article:delete:own',
    'article:publish:own',
    'article:restore:own',
    'article:version:view',
    'article:version:restore:own',
    'comment:view',
    'comment:create',
    'comment:edit:own',
    'comment:delete:own',
    'search:basic',
    'search:advanced',
  ],
  editor: [
    'article:view:published',
    'article:view:draft:own',
    'article:view:draft:all',
    'article:create',
    'article:edit:own',
    'article:edit:all',
    'article:delete:own',
    'article:delete:all',
    'article:publish:own',
    'article:publish:all',
    'article:archive',
    'article:restore:own',
    'article:restore:all',
    'article:version:view',
    'article:version:restore:own',
    'article:version:restore:all',
    'comment:view',
    'comment:create',
    'comment:edit:own',
    'comment:edit:all',
    'comment:delete:own',
    'comment:delete:all',
    'search:basic',
    'search:advanced',
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
