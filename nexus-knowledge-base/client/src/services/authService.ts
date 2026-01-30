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
  async getCurrentUser(): Promise<{ data: AuthResponse }> {
    return apiClient.get<{ data: AuthResponse }>('/auth/me');
  },

  /**
   * Get available roles (development only)
   */
  async getRoles(): Promise<{ data: Array<{ id: string; displayName: string; role: string }> }> {
    return apiClient.get<{ data: Array<{ id: string; displayName: string; role: string }> }>(
      '/auth/roles'
    );
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
