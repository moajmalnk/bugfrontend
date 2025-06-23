/**
 * Professional Service Worker Manager
 * Handles registration, updates, and communication with service worker
 */

export interface ServiceWorkerManager {
  register(): Promise<ServiceWorkerRegistration | null>;
  unregister(): Promise<boolean>;
  update(): Promise<void>;
  clearCache(): Promise<boolean>;
  getVersion(): Promise<string>;
  onUpdateAvailable(callback: () => void): void;
  onOffline(callback: () => void): void;
  onOnline(callback: () => void): void;
}

class BugricerServiceWorkerManager implements ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateCallbacks: (() => void)[] = [];
  private offlineCallbacks: (() => void)[] = [];
  private onlineCallbacks: (() => void)[] = [];

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Register the service worker with professional error handling
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      // console.warn('[SW Manager] Service workers not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      // console.log('[SW Manager] Service worker registered:', this.registration.scope);

      // Set up update detection
      this.setupUpdateDetection();

      // Check for waiting service worker
      if (this.registration.waiting) {
        this.notifyUpdateAvailable();
      }

      return this.registration;
    } catch (error) {
      // console.error('[SW Manager] Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      // console.log('[SW Manager] Service worker unregistered:', result);
      this.registration = null;
      return result;
    } catch (error) {
      // console.error('[SW Manager] Failed to unregister service worker:', error);
      return false;
    }
  }

  /**
   * Force update the service worker
   */
  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    try {
      await this.registration.update();
      // console.log('[SW Manager] Service worker update check completed');
    } catch (error) {
      // console.error('[SW Manager] Service worker update failed:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<boolean> {
    try {
      if (this.registration?.active) {
        const response = await this.sendMessage({ type: 'CLEAR_CACHE' });
        return response.success;
      }

      // Fallback: Clear caches directly
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      // console.log('[SW Manager] All caches cleared (fallback method)');
      return true;
    } catch (error) {
      // console.error('[SW Manager] Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get service worker version
   */
  async getVersion(): Promise<string> {
    try {
      if (this.registration?.active) {
        const response = await this.sendMessage({ type: 'GET_VERSION' });
        return response.version || 'unknown';
      }
      return 'not-registered';
    } catch (error) {
      // console.error('[SW Manager] Failed to get version:', error);
      return 'error';
    }
  }

  /**
   * Register callback for update available
   */
  onUpdateAvailable(callback: () => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Register callback for offline status
   */
  onOffline(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  /**
   * Register callback for online status
   */
  onOnline(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  /**
   * Send message to service worker with promise-based response
   */
  private sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.registration?.active) {
        reject(new Error('No active service worker'));
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 5000);

      this.registration.active.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Set up update detection and handling
   */
  private setupUpdateDetection(): void {
    if (!this.registration) return;

    // Listen for new service worker installing
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // console.log('[SW Manager] New service worker installed');
          this.notifyUpdateAvailable();
        }
      });
    });

    // Listen for controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // console.log('[SW Manager] Service worker controller changed');
      // Optionally reload the page - this maintains the current route structure
      // In the future, this could be enhanced to preserve role-based routes
      window.location.reload();
    });

    // Check for updates periodically
    setInterval(() => {
      this.update().catch(() => {
        // Ignore update check errors
      });
    }, 60000); // Check every minute
  }

  /**
   * Set up network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      // console.log('[SW Manager] Network online');
      this.onlineCallbacks.forEach(callback => callback());
    });

    window.addEventListener('offline', () => {
      // console.log('[SW Manager] Network offline');
      this.offlineCallbacks.forEach(callback => callback());
    });
  }

  /**
   * Notify all registered callbacks about update availability
   */
  private notifyUpdateAvailable(): void {
    this.updateCallbacks.forEach(callback => callback());
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
}

// Export singleton instance
export const serviceWorkerManager = new BugricerServiceWorkerManager();

/**
 * Professional service worker initialization with error boundaries
 */
export async function initializeServiceWorker(): Promise<void> {
  // Only register in production or when explicitly enabled
  const isProduction = process.env.NODE_ENV === 'production';
  const forceEnable = localStorage.getItem('sw-force-enable') === 'true';
  
  if (!isProduction && !forceEnable) {
    // console.log('[SW Manager] Service worker disabled in development');
    return;
  }

  try {
    const registration = await serviceWorkerManager.register();
    
    if (registration) {
      // console.log('[SW Manager] Service worker initialized successfully');
      
      // Set up update notifications
      serviceWorkerManager.onUpdateAvailable(() => {
        // Show user notification about available update
        if (window.confirm('A new version is available. Would you like to update?')) {
          serviceWorkerManager.skipWaiting();
        }
      });

      // Set up network status handling
      serviceWorkerManager.onOffline(() => {
        // console.log('[SW Manager] App is now offline');
        // Show offline indicator
      });

      serviceWorkerManager.onOnline(() => {
        // console.log('[SW Manager] App is now online');
        // Hide offline indicator
      });
    }
  } catch (error) {
    // console.error('[SW Manager] Failed to initialize service worker:', error);
  }
}

/**
 * Development helper to clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    await serviceWorkerManager.clearCache();
    // console.log('[SW Manager] Development cache cleared');
  }
} 