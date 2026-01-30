import apiClient from './apiClient';
import { Category } from '../types';

/**
 * Category Service
 * 
 * Handles category-related API calls
 */
export const categoryService = {
  /**
   * Get all categories
   */
  async getAll(): Promise<{ data: Category[] }> {
    return apiClient.get<{ data: Category[] }>('/categories');
  },

  /**
   * Get a single category
   */
  async getById(id: string): Promise<{ data: Category }> {
    return apiClient.get<{ data: Category }>(`/categories/${id}`);
  },

  /**
   * Create a new category (editors only)
   */
  async create(
    name: string,
    description?: string,
    parentId?: string
  ): Promise<{ message: string; data: Category }> {
    return apiClient.post<{ message: string; data: Category }>('/categories', {
      name,
      description,
      parentId,
    });
  },

  /**
   * Update a category (editors only)
   */
  async update(
    id: string,
    name?: string,
    description?: string
  ): Promise<{ message: string; data: Category }> {
    return apiClient.put<{ message: string; data: Category }>(`/categories/${id}`, {
      name,
      description,
    });
  },

  /**
   * Delete a category (editors only)
   */
  async delete(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/categories/${id}`);
  },
};

export default categoryService;
