import { useEffect } from 'react';
import { apiClient } from '@/lib/axios';
import { useErrorBoundary } from '@/components/ErrorBoundaryManager';

export const useApiErrorHandler = () => {
  const { showError } = useErrorBoundary();

  useEffect(() => {
    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error: any) => {
        // Handle different types of API errors
        if (error.response) {
          const status = error.response.status;
          
          switch (status) {
            case 401:
              showError({
                type: 'auth',
                message: 'Your session has expired. Please log in again to continue.',
                canRetry: false,
                requiresLogin: true,
                severity: 'critical'
              });
              break;
              
            case 403:
              showError({
                type: 'auth',
                message: 'You don\'t have permission to perform this action.',
                canRetry: true,
                requiresLogin: false,
                severity: 'error'
              });
              break;
              
            case 404:
              // Don't show error for 404s as they're usually handled by components
              break;
              
            case 429:
              showError({
                type: 'server',
                message: 'Too many requests. Please wait a moment and try again.',
                canRetry: true,
                requiresLogin: false,
                severity: 'warning'
              });
              break;
              
            case 500:
            case 502:
            case 503:
            case 504:
              showError({
                type: 'server',
                message: 'Server error occurred. The service may be temporarily unavailable.',
                canRetry: true,
                requiresLogin: false,
                severity: 'error'
              });
              break;
              
            default:
              // For other HTTP errors, let components handle them
              break;
          }
        } else if (error.request) {
          // Network error - no response received
          showError({
            type: 'network',
            message: 'Unable to connect to the server. Please check your internet connection.',
            canRetry: true,
            requiresLogin: false,
            severity: 'error'
          });
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, [showError]);
}; 