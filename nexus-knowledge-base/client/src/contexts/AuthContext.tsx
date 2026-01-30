import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { User, UserRole, AuthResponse } from '../types';
import { authService } from '../services';

/**
 * Auth State Interface
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  availableRoles: Array<{ id: string; displayName: string; role: string }>;
}

/**
 * Auth Actions
 */
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'SET_ROLES'; payload: Array<{ id: string; displayName: string; role: string }> }
  | { type: 'CLEAR_ERROR' };

/**
 * Initial state
 */
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  availableRoles: [],
};

/**
 * Auth reducer
 */
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        availableRoles: state.availableRoles,
      };
    case 'SET_ROLES':
      return { ...state, availableRoles: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

/**
 * Auth Context Interface
 */
interface AuthContextType extends AuthState {
  login: (userId: string) => Promise<void>;
  logout: () => void;
  switchRole: (userId?: string, role?: UserRole) => Promise<void>;
  fetchRoles: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  canCreate: () => boolean;
  canEdit: (authorId?: string) => boolean;
  canDelete: () => boolean;
  canPublish: () => boolean;
}

/**
 * Create context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Permission matrix
 */
const PERMISSIONS: Record<UserRole, string[]> = {
  reader: ['read'],
  actor: ['read', 'comment'],
  author: ['read', 'comment', 'create', 'edit-own', 'delete-own'],
  editor: ['read', 'comment', 'create', 'edit', 'delete', 'publish', 'manage-categories'],
};

/**
 * Auth Provider Component
 */
interface AuthProviderProps {
  children: ReactNode;
  defaultUserId?: string;
}

export function AuthProvider({ children, defaultUserId = 'editor-1' }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /**
   * Login with a mock user ID
   */
  const login = useCallback(async (userId: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      authService.setMockUser(userId);
      const response = await authService.getCurrentUser();
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: 'Failed to authenticate' });
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    authService.logout();
    dispatch({ type: 'AUTH_LOGOUT' });
  }, []);

  /**
   * Switch to a different role/user
   */
  const switchRole = useCallback(async (userId?: string, role?: UserRole) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.switchRole({ userId, role });
      if (userId) {
        authService.setMockUser(userId);
      }
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: 'Failed to switch role' });
    }
  }, []);

  /**
   * Fetch available roles
   */
  const fetchRoles = useCallback(async () => {
    try {
      const roles = await authService.getRoles();
      dispatch({ type: 'SET_ROLES', payload: roles });
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!state.user) return false;
      const rolePermissions = PERMISSIONS[state.user.role] || [];
      return rolePermissions.includes(permission);
    },
    [state.user]
  );

  /**
   * Check if user can create articles
   */
  const canCreate = useCallback((): boolean => {
    return hasPermission('create');
  }, [hasPermission]);

  /**
   * Check if user can edit an article
   */
  const canEdit = useCallback(
    (authorId?: string): boolean => {
      if (!state.user) return false;
      if (hasPermission('edit')) return true;
      if (hasPermission('edit-own') && authorId === state.user.id) return true;
      return false;
    },
    [state.user, hasPermission]
  );

  /**
   * Check if user can delete articles
   */
  const canDelete = useCallback((): boolean => {
    return hasPermission('delete');
  }, [hasPermission]);

  /**
   * Check if user can publish articles
   */
  const canPublish = useCallback((): boolean => {
    return hasPermission('publish');
  }, [hasPermission]);

  /**
   * Initialize authentication on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      await login(defaultUserId);
      await fetchRoles();
    };
    initAuth();
  }, [defaultUserId, login, fetchRoles]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    switchRole,
    fetchRoles,
    clearError,
    hasPermission,
    canCreate,
    canEdit,
    canDelete,
    canPublish,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
