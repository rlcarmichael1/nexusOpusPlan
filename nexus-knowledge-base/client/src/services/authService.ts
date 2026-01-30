import apiClient from './apiClient';
import { User, AuthResponse } from '../types';

/**
 * Auth Service
 * 
 * Handles authentication-related API calls
 */
export const authService = {
  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<AuthResponse> {
    const response = await apiClient.get<{ data: { user: User; permissions: string[] } }>('/auth/me');
    return { user: response.data.user, permissions: response.data.permissions };
  },

  /**
   * Get available roles (development only)
   */
  async getRoles(): Promise<Array<{ id: string; displayName: string; role: string }>> {
    const response = await apiClient.get<{ data: Array<{ id: string; displayName: string; role: string }> }>(
      '/auth/roles'
    );
    return response.data;
  },

  /**
   * Switch mock user role (development only)
   */
  async switchRole(params: { userId?: string; role?: string }): Promise<{ message: string; user: User }> {
    return apiClient.post<{ message: string; user: User }>('/auth/switch-role', params);
  },

  /**
   * Set the mock user for API requests
   */
  setMockUser(userId: string): void {
    apiClient.setMockUser(userId);
  },

  /**
   * Clear authentication
   */
  logout(): void {
    apiClient.clearAuth();
  },
};

export default authService;
