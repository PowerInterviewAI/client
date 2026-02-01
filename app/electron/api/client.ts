/**
 * HTTP API Client
 * Base client for making HTTP requests to backend
 */

import { app } from 'electron';

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  status: number;
}

export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string> = {};

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': `PowerInterview/${app.getVersion()}`,
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    delete this.headers['Authorization'];
  }

  /**
   * Make GET request
   */
  async get<T>(path: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);
    return this.request<T>('GET', url);
  }

  /**
   * Make POST request
   */
  async post<T>(path: string, body?: any): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('POST', url, body);
  }

  /**
   * Make PUT request
   */
  async put<T>(path: string, body?: any): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('PUT', url, body);
  }

  /**
   * Make DELETE request
   */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.request<T>('DELETE', url);
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    method: string,
    url: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          status: response.status,
          error: {
            code: data.code || 'HTTP_ERROR',
            message: data.message || response.statusText,
            details: data.details,
          },
        };
      }

      return {
        status: response.status,
        data,
      };
    } catch (error: any) {
      return {
        status: 0,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network request failed',
        },
      };
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, any>): string {
    const url = new URL(path, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }
}
