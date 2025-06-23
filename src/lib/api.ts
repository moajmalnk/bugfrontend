import { ENV } from './env';

// Types for HTTP methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Basic API client for future PHP backend connection
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  // Set authentication token
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
  
  // Get stored token
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    }
    return this.token;
  }
  
  // Make API request
  async request<T>(endpoint: string, method: HttpMethod = 'GET', data?: any): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }
    
    try {
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }
      
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // console.error(`API request failed: ${error}`);
      throw error;
    }
  }
  
  // Helper methods for common HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, 'GET');
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, 'POST', data);
  }
  
  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, 'PUT', data);
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, 'DELETE');
  }
}

export const api = new ApiClient(ENV.API_URL);
