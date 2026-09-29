import axios, { type InternalAxiosRequestConfig } from 'axios';
import { ENV } from './env';
import { extractApiErrorMessage, getNetworkErrorMessage } from './apiError';
import {
  API_MAX_RETRIES,
  acquireApiSlot,
  isServerBusyResponse,
  releaseApiSlot,
  retryDelayMs,
  sleep,
} from './apiTraffic';

type TrackedConfig = InternalAxiosRequestConfig & { __slotHeld?: boolean; __retryCount?: number };

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: false, // Changed to false to avoid CORS issues
  timeout: 30000, // 30 second timeout
});

// Request interceptor for debugging and impersonation
apiClient.interceptors.request.use(
  async (config: TrackedConfig) => {
    await acquireApiSlot();
    config.__slotHeld = true;

    // Set Content-Type only if not FormData (FormData needs browser to set boundary)
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    } else {
      // Remove Content-Type header for FormData - browser will set it with boundary
      delete config.headers['Content-Type'];
    }
    
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
          if (config.url && !config.url.includes('impersonate=')) {
            const separator = config.url.includes('?') ? '&' : '?';
            config.url = config.url + separator + 'impersonate=' + encodeURIComponent(payload.user_id);
          }
          
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
      } catch {
        // Ignore token parsing errors, continue with normal flow
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
    const done = response.config as TrackedConfig;
    if (done.__slotHeld) {
      done.__slotHeld = false;
      releaseApiSlot();
    }
    // console.log('API Response:', {
    //   url: response.config.url,
    //   status: response.status,
    //   data: response.data
    // });
    return response;
  },
  async (error) => {
    const failed = error.config as TrackedConfig | undefined;
    if (failed?.__slotHeld) {
      failed.__slotHeld = false;
      releaseApiSlot();
    }
    const busyStatus = error.response?.status ?? 0;
    const busyMessage = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (failed && isServerBusyResponse(busyStatus, busyMessage)) {
      const attempt = failed.__retryCount ?? 0;
      if (attempt < API_MAX_RETRIES) {
        failed.__retryCount = attempt + 1;
        await sleep(retryDelayMs(attempt, error.response?.headers?.['retry-after']));
        return apiClient(failed);
      }
    }
    // console.error('Response Error:', {
    //   url: error.config?.url,
    //   status: error.response?.status,
    //   statusText: error.response?.statusText,
    //   data: error.response?.data,
    //   message: error.message
    // });
    
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.response?.status === 0) {
      error.message = getNetworkErrorMessage(error);
    } else {
      const apiMessage = extractApiErrorMessage(error, '');
      if (apiMessage) {
        error.message = apiMessage;
      }
    }

    const status = error.response?.status;
    const errData = error.response?.data as { error_code?: string } | undefined;
    if (
      (status === 403 && errData?.error_code === "ACCOUNT_REVOKED") ||
      (status === 401 && errData?.error_code === "SESSION_REVOKED")
    ) {
      window.dispatchEvent(new CustomEvent("auth:revoked"));
    }
    
    return Promise.reject(error);
  }
); 