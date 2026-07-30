import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/axios';
import { useErrorBoundary } from '@/components/ErrorBoundaryManager';
import { isBrowserOnline } from '@/lib/networkStatus';

const NETWORK_ALERT_COOLDOWN_MS = 90_000;

export const useApiErrorHandler = () => {
  const { showError } = useErrorBoundary();
  const lastNetworkAlertAt = useRef(0);

  useEffect(() => {
    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error: any) => {
        const config = error?.config as
          | { silentError?: boolean; skipErrorHandler?: boolean; url?: string }
          | undefined;

        // Background / optional calls must not open Connection Issue UI
        if (config?.silentError || config?.skipErrorHandler) {
          return Promise.reject(error);
        }

        if (error.response) {
          const status = error.response.status;

          switch (status) {
            case 401:
              showError({
                type: 'auth',
                message: 'Your session has expired. Please log in again to continue.',
                canRetry: false,
                requiresLogin: true,
                severity: 'critical',
              });
              break;

            case 403:
              showError({
                type: 'auth',
                message: "You don't have permission to perform this action.",
                canRetry: true,
                requiresLogin: false,
                severity: 'error',
              });
              break;

            case 404:
              break;

            case 429:
              showError({
                type: 'server',
                message: 'Too many requests. Please wait a moment and try again.',
                canRetry: true,
                requiresLogin: false,
                severity: 'warning',
              });
              break;

            case 500:
            case 502:
            case 503:
            case 504: {
              const now = Date.now();
              if (now - lastNetworkAlertAt.current >= NETWORK_ALERT_COOLDOWN_MS) {
                lastNetworkAlertAt.current = now;
                showError({
                  type: 'server',
                  message:
                    'Server error occurred. The service may be temporarily unavailable.',
                  canRetry: true,
                  requiresLogin: false,
                  severity: 'error',
                });
              }
              break;
            }

            default:
              break;
          }
        } else if (error.request) {
          // Already offline → rely on the slim top banner, not Connection Issue alerts
          if (!isBrowserOnline()) {
            return Promise.reject(error);
          }

          const now = Date.now();
          if (now - lastNetworkAlertAt.current >= NETWORK_ALERT_COOLDOWN_MS) {
            lastNetworkAlertAt.current = now;
            showError({
              type: 'network',
              message:
                'Unable to reach BugRicer right now. We will keep trying in the background.',
              canRetry: true,
              requiresLogin: false,
              severity: 'warning',
            });
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, [showError]);
};
