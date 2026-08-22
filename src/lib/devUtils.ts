/**
 * Development utilities for service worker management and debugging
 * These utilities are only available in development mode
 */

import { serviceWorkerManager } from './serviceWorkerManager';

declare global {
  interface Window {
    __DEV_UTILS__: typeof devUtils;
    __SW_DEBUG__: boolean;
  }
}

export const devUtils = {
  /**
   * Enable service worker in development
   */
  enableServiceWorker: () => {
    localStorage.setItem('sw-force-enable', 'true');
    // console.log('[DevUtils] Service worker enabled for development');
    // Reload the page - this maintains the current route structure
    // In the future, this could be enhanced to preserve role-based routes
    window.location.reload();
  },

  /**
   * Disable service worker in development
   */
  disableServiceWorker: async () => {
    localStorage.removeItem('sw-force-enable');
    await serviceWorkerManager.unregister();
    // console.log('[DevUtils] Service worker disabled for development');
    // Reload the page - this maintains the current route structure
    // In the future, this could be enhanced to preserve role-based routes
    window.location.reload();
  },

  /**
   * Clear all caches
   */
  clearCaches: async () => {
    const success = await serviceWorkerManager.clearCache();
    // console.log('[DevUtils] Cache clearing result:', success);
    return success;
  },

  /**
   * Get service worker version
   */
  getVersion: async () => {
    const version = await serviceWorkerManager.getVersion();
    // console.log('[DevUtils] Service worker version:', version);
    return version;
  },

  /**
   * Force service worker update
   */
  forceUpdate: async () => {
    try {
      await serviceWorkerManager.update();
      // console.log('[DevUtils] Service worker update triggered');
    } catch (error) {
      // console.error('[DevUtils] Service worker update failed:', error);
    }
  },

  /**
   * Simulate chunk loading error
   */
  simulateChunkError: () => {
    const error = new Error('Failed to fetch dynamically imported module');
    window.dispatchEvent(new ErrorEvent('error', { error, message: error.message }));
    // console.log('[DevUtils] Simulated chunk loading error');
  },

  /**
   * Simulate network offline
   */
  goOffline: () => {
    window.dispatchEvent(new Event('offline'));
    // console.log('[DevUtils] Simulated offline mode');
  },

  /**
   * Simulate network online
   */
  goOnline: () => {
    window.dispatchEvent(new Event('online'));
    // console.log('[DevUtils] Simulated online mode');
  },

  /**
   * Get all cache names
   */
  getCacheNames: async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      // console.log('[DevUtils] Cache names:', names);
      return names;
    }
    return [];
  },

  /**
   * Enable service worker debugging
   */
  enableSWDebug: () => {
    window.__SW_DEBUG__ = true;
    // console.log('[DevUtils] Service worker debugging enabled');
  },

  /**
   * Disable service worker debugging
   */
  disableSWDebug: () => {
    window.__SW_DEBUG__ = false;
    // console.log('[DevUtils] Service worker debugging disabled');
  },

  /**
   * Show help message
   */
  help: () => undefined,
};

export function initDevUtils(): void {
  if (import.meta.env.DEV) {
    window.__DEV_UTILS__ = devUtils;
    window.__SW_DEBUG__ = false;
  }
} 