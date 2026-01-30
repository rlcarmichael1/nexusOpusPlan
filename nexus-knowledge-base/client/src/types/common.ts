/**
 * API error response
 */
export interface ApiError {
  code: string;
  message: string;
  correlationId?: string;
  details?: unknown;
  validationErrors?: Record<string, string[]>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: ApiError;
}

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

/**
 * Layout mode for responsive design
 */
export type LayoutMode = 'full' | 'compact' | 'sidebar';

/**
 * View mode for articles
 */
export type ArticleViewMode = 'view' | 'edit' | 'create';
