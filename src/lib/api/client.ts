/**
 * Centralized API Client for Krashaq Frontend
 * Browser calls same-origin /api/* routes (Next.js monolith).
 */

import { getBrowserApiBaseUrl } from '@/lib/api/base-url';

const API_URL = getBrowserApiBaseUrl();

export interface ApiRequestOptions extends Omit<RequestInit, 'cache'> {
  params?: Record<string, string>;
  skipAuth?: boolean;
  skipRetry?: boolean;
  useCache?: boolean;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  ok: boolean;
  headers: Headers;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private retryCount: number;
  private retryDelay: number;

  constructor() {
    this.baseURL = API_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.retryCount = 3;
    this.retryDelay = 1000;
  }

  /**
   * Get authentication token from localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      localStorage.setItem('accessToken', data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (!this.baseURL) {
      if (!params) return path;
      const search = new URLSearchParams(params).toString();
      return `${path}?${search}`;
    }

    const url = new URL(`${this.baseURL}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(
    url: string,
    options: ApiRequestOptions,
    retryAttempt = 0
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, options);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !options.skipAuth && retryAttempt === 0) {
        const newToken = await this.refreshToken();
        if (newToken) {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return this.executeRequest<T>(url, options, retryAttempt + 1);
        }
      }

      // Handle 5xx errors with retry
      if (response.status >= 500 && !options.skipRetry && retryAttempt < this.retryCount) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (retryAttempt + 1)));
        return this.executeRequest<T>(url, options, retryAttempt + 1);
      }

      let data: T;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as T;
      }

      return {
        data,
        status: response.status,
        ok: response.ok,
        headers: response.headers,
      };
    } catch (error) {
      console.error('API request failed:', error);

      // Retry on network errors
      if (!options.skipRetry && retryAttempt < this.retryCount) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (retryAttempt + 1)));
        return this.executeRequest<T>(url, options, retryAttempt + 1);
      }

      throw error;
    }
  }

  /**
   * Prepare request with authentication and headers
   */
  private prepareRequest(options: ApiRequestOptions): ApiRequestOptions {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers as Record<string, string> | undefined),
    };

    // Add authorization header if not skipped
    if (!options.skipAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return {
      ...options,
      headers,
    };
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params);
    const preparedOptions = this.prepareRequest({
      ...options,
      method: 'GET',
    });
    return this.executeRequest<T>(url, preparedOptions);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params);
    const preparedOptions = this.prepareRequest({
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.executeRequest<T>(url, preparedOptions);
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params);
    const preparedOptions = this.prepareRequest({
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return this.executeRequest<T>(url, preparedOptions);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params);
    const preparedOptions = this.prepareRequest({
      ...options,
      method: 'DELETE',
    });
    return this.executeRequest<T>(url, preparedOptions);
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params);
    const preparedOptions = this.prepareRequest({
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return this.executeRequest<T>(url, preparedOptions);
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) => apiClient.get<T>(endpoint, options),
  post: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiClient.post<T>(endpoint, body, options),
  put: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiClient.put<T>(endpoint, body, options),
  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiClient.delete<T>(endpoint, options),
  patch: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiClient.patch<T>(endpoint, body, options),
};
