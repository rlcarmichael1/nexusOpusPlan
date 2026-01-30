/**
 * User role types for RBAC
 */
export type UserRole = 'reader' | 'actor' | 'author' | 'editor';

/**
 * User interface
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
 * Auth response from API
 */
export interface AuthResponse {
  user: User;
  permissions: string[];
}

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  reader: 'Reader',
  actor: 'Actor',
  author: 'Author',
  editor: 'Editor',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  reader: 'Can view published articles and version history',
  actor: 'Can view and comment on published articles',
  author: 'Can create, edit, and publish own articles',
  editor: 'Full access to all articles and admin functions',
};
