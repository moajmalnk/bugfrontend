/**
 * Utility for handling chunk loading errors with retry logic
 */

interface ChunkLoadOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: Required<ChunkLoadOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  onRetry: () => {},
  onError: () => {},
};

/**
 * Enhanced lazy loading with retry mechanism
 */
export function createRetryableLazyImport<T = any>(
  importFn: () => Promise<T>,
  options: ChunkLoadOptions = {}
): () => Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return async (): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await importFn();
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a chunk loading error
        const isChunkError = 
          error instanceof Error && (
            error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Loading chunk') ||
            error.message.includes('ChunkLoadError') ||
            error.message.includes('Loading CSS chunk')
          );
        
        if (!isChunkError || attempt === opts.maxRetries) {
          opts.onError?.(lastError);
          throw lastError;
        }
        
        console.warn(`Chunk loading failed (attempt ${attempt}/${opts.maxRetries}), retrying...`, error);
        opts.onRetry?.(attempt);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay * attempt));
      }
    }
    
    throw lastError;
  };
}

/**
 * Clear browser caches to help with chunk loading issues
 */
export async function clearBrowserCaches(): Promise<void> {
  try {
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    // Clear localStorage cache entries
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cache') || key.includes('chunk') || key.includes('vite'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage cache entries
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('cache') || key.includes('chunk') || key.includes('vite'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    console.log('Browser caches cleared successfully');
  } catch (error) {
    console.warn('Failed to clear some browser caches:', error);
  }
}

/**
 * Force reload with cache bypass
 */
export function forceReloadWithCacheBypass(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('_t', Date.now().toString());
  window.location.href = url.toString();
}

/**
 * Check if an error is a chunk loading error
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('loading css chunk') ||
    message.includes('expected a javascript module script') ||
    message.includes('mime type')
  );
}
