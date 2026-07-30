/**
 * Tracks browser online/offline state without toast spam.
 * UI should use a single subtle banner (see App OfflineBanner).
 */

import { subscribeNetworkStatus, isBrowserOnline } from '@/lib/networkStatus';

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

export const isAppOnline = () => isOnline;

export const initOfflineDetector = () => {
  isOnline = isBrowserOnline();

  const unsubscribe = subscribeNetworkStatus((online) => {
    isOnline = online;
  });

  // Keep native listeners in sync if subscribe was a no-op in SSR
  const handleOnline = () => {
    isOnline = true;
  };
  const handleOffline = () => {
    isOnline = false;
  };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    unsubscribe();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
