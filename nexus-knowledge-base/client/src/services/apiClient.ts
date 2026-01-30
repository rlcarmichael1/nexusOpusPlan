import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { ApiError } from '../types';

/**
 * API Client Configuration
 */
const API_BASE_URL = '/api';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

/**
 * Create axios instance with default configuration
 */
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Add correlation ID for request tracing
      config.headers['X-Correlation-ID'] = generateCorrelationId();
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error: ApiError }>) => {
      const apiError = normalizeError(error);
      return Promise.reject(apiError);
    }
  );

  return instance;
};

/**
 * Generate correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Normalize axios error to ApiError
 */
function normalizeError(error: AxiosError<{ error: ApiError }>): ApiError {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.code === 'ECONNABORTED') {
    return {
      code: 'TIMEOUT',
      message: 'Request timed out. Please try again.',
    };
  }

  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to server. Please check your connection.',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
  };
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number): number {
  const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, 4000);
}

/**
 * Sleep for a duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryable(error: ApiError): boolean {
  const retryableCodes = ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'];
  return retryableCodes.includes(error.code);
}

/**
 * API Client with retry logic
 */
class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = createApiInstance();
  }

  /**
   * Set mock user for authentication (development)
   */
  setMockUser(userId: string): void {
    this.instance.defaults.headers.common['Authorization'] = `Bearer mock:${userId}`;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    delete this.instance.defaults.headers.common['Authorization'];
  }

  /**
   * Make a request with retry logic
   */
  private async requestWithRetry<T>(
    config: AxiosRequestConfig,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.instance.request<T>(config);
        return response.data;
      } catch (error) {
        lastError = error as ApiError;

        if (attempt < retries - 1 && isRetryable(lastError)) {
          const delay = calculateBackoff(attempt);
          console.warn(`Request failed, retrying in ${delay}ms...`, {
            attempt: attempt + 1,
            maxRetries: retries,
            error: lastError.code,
          });
          await sleep(delay);
        }
      }
    }

    throw lastError || { code: 'UNKNOWN_ERROR', message: 'Request failed' };
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>({
      ...config,
      method: 'GET',
      url,
    });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>({
      ...config,
      method: 'POST',
      url,
      data,
    });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>({
      ...config,
      method: 'PUT',
      url,
      data,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>({
      ...config,
      method: 'DELETE',
      url,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
