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
  help: () => {
    console.log(`
🔧 BUGRICER DEVELOPMENT UTILITIES

Service Worker Commands:
- __DEV_UTILS__.enableServiceWorker()     Enable SW in development
- __DEV_UTILS__.disableServiceWorker()    Disable SW in development
- __DEV_UTILS__.clearCaches()             Clear all caches
- __DEV_UTILS__.getVersion()              Get SW version
- __DEV_UTILS__.forceUpdate()             Force SW update
- __DEV_UTILS__.getCacheNames()           List all cache names

Simulation Commands:
- __DEV_UTILS__.simulateChunkError()      Simulate chunk loading error
- __DEV_UTILS__.goOffline()               Simulate offline mode
- __DEV_UTILS__.goOnline()                Simulate online mode

Debug Commands:
- __DEV_UTILS__.enableSWDebug()           Enable SW debugging
- __DEV_UTILS__.disableSWDebug()          Disable SW debugging
- __DEV_UTILS__.help()                    Show this help

Examples:
  // Enable service worker for testing
  __DEV_UTILS__.enableServiceWorker()
  
  // Clear caches when having issues
  await __DEV_UTILS__.clearCaches()
  
  // Test error handling
  __DEV_UTILS__.simulateChunkError()
    `);
  }
};

/**
 * Initialize development utilities
 * Only available in development mode
 */
export function initDevUtils(): void {
  if (process.env.NODE_ENV === 'development') {
    window.__DEV_UTILS__ = devUtils;
    window.__SW_DEBUG__ = false;
    
    console.log(`
🚀 Bugricer Development Mode

Type __DEV_UTILS__.help() in the // console for available commands.

Quick Start:
- Enable SW: __DEV_UTILS__.enableServiceWorker()
- Clear caches: __DEV_UTILS__.clearCaches()
- Get help: __DEV_UTILS__.help()
    `);
  }
} 