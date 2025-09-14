import axios from 'axios';
import { ENV } from './env';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Changed to false to avoid CORS issues
  timeout: 30000, // 30 second timeout
});

// Request interceptor for debugging and impersonation
apiClient.interceptors.request.use(
  (config) => {
    // console.log('API Request:', {
    //   url: config.url,
    //   method: config.method,
    //   baseURL: config.baseURL,
    //   headers: config.headers,
    //   data: config.data
    // });
    const token = sessionStorage.getItem('token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      
      // Check if we're in impersonation mode (dashboard access with admin token)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // If this is a dashboard access token and we have admin_id, we're impersonating
        if (payload.purpose === 'dashboard_access' && payload.admin_id && payload.user_id) {
          // Add impersonation header and query param so backend knows to create items as the target user
          config.headers['X-Impersonate-User'] = payload.user_id;
          config.headers['X-User-Id'] = payload.user_id;
          
          // Also add as query parameter for reliability
          const separator = config.url.includes('?') ? '&' : '?';
          const originalUrl = config.url;
          config.url = config.url + separator + 'impersonate=' + encodeURIComponent(payload.user_id);
          
          // For POST requests, also add to the body
          if (
            config.method === 'post' &&
            config.data &&
            typeof config.data === 'object' &&
            config.data !== null &&
            !Array.isArray(config.data)
          ) {
            (config.data as Record<string, unknown>)['impersonate_user_id'] = payload.user_id;
          }

        }
      } catch (e) {
        // Ignore token parsing errors, continue with normal flow
        console.log('Token parsing error:', e);
      }
    }
    return config;
  },
  (error) => {
    // console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
apiClient.interceptors.response.use(
  (response) => {
    // console.log('API Response:', {
    //   url: response.config.url,
    //   status: response.status,
    //   data: response.data
    // });
    return response;
  },
  (error) => {
    // console.error('Response Error:', {
    //   url: error.config?.url,
    //   status: error.response?.status,
    //   statusText: error.response?.statusText,
    //   data: error.response?.data,
    //   message: error.message
    // });
    
    // Add specific handling for common production issues
    if (error.code === 'ERR_NETWORK') {
      error.message = 'Network error - please check your internet connection';
    } else if (error.response?.status === 0) {
      error.message = 'Cannot connect to server - please check if the API is running';
    }
    
    return Promise.reject(error);
  }
); 