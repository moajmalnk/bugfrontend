// Dynamic cache versioning based on build time
const BUILD_TIME = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
const CACHE_NAME = `bugricer-v${BUILD_TIME}`;
const STATIC_CACHE = `bugricer-static-v${BUILD_TIME}`;
const DYNAMIC_CACHE = `bugricer-dynamic-v${BUILD_TIME}`;

// Define cacheable resources with strategic priorities
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

const STATIC_RESOURCES = [
  '/placeholder.svg',
  '/version.json',
];

// URLs that should never be cached
const EXCLUDE_FROM_CACHE = [
  '/api/',
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  'ms-browser-extension://',
  '/sockjs-node/',
  '/hot-update',
  '.hot-update.',
];

/**
 * Check if URL should be cached
 * Professional filtering to prevent caching issues
 */
function shouldCache(request) {
  const url = request.url;
  
  // Exclude unsupported schemes and development resources
  for (const exclude of EXCLUDE_FROM_CACHE) {
    if (url.includes(exclude)) {
      return false;
    }
  }
  
  // Only cache HTTP/HTTPS requests
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Professional cache strategy with fallbacks
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // API requests: Network First (fresh data preferred)
  if (url.pathname.includes('/api/')) {
    return 'networkFirst';
  }
  
  // Static assets: Cache First (performance optimized)
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    return 'cacheFirst';
  }
  
  // HTML pages: Stale While Revalidate (balanced approach)
  return 'staleWhileRevalidate';
}

// Install event - Cache critical resources
self.addEventListener('install', event => {
  // console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache critical resources immediately
      caches.open(STATIC_CACHE).then(cache => {
        // console.log('[ServiceWorker] Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // Cache static resources
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(STATIC_RESOURCES).catch(err => {
          // console.warn('[ServiceWorker] Some static resources failed to cache:', err);
        });
      }),
    ]).then(() => {
      // console.log('[ServiceWorker] Installation complete');
      // Force activation of new service worker
      return self.skipWaiting();
    }).catch(err => {
      // console.error('[ServiceWorker] Installation failed:', err);
    })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  // console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      const validCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE];
      
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete any cache that doesn't match current version
          if (!validCaches.includes(cacheName)) {
            // console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // console.log('[ServiceWorker] Activation complete');
      // Take control of all pages immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_NAME
          });
        });
      });
    })
  );
});

// Fetch event - Professional caching strategies
self.addEventListener('fetch', event => {
  // Skip non-cacheable requests early
  if (!shouldCache(event.request)) {
    return;
  }
  
  // Special handling for JavaScript modules to prevent MIME type issues
  if (event.request.url.includes('.js') && event.request.destination === 'script') {
    event.respondWith(handleJavaScriptModule(event.request));
    return;
  }
  
  const strategy = getCacheStrategy(event.request);
  
  switch (strategy) {
    case 'networkFirst':
      event.respondWith(networkFirst(event.request));
      break;
    case 'cacheFirst':
      event.respondWith(cacheFirst(event.request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(event.request));
      break;
    default:
      event.respondWith(networkFirst(event.request));
  }
});

/**
 * Special handler for JavaScript modules to prevent MIME type issues
 */
async function handleJavaScriptModule(request) {
  try {
    // Always try network first for JS modules to get latest version
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Ensure proper MIME type
      const headers = new Headers(networkResponse.headers);
      headers.set('Content-Type', 'application/javascript; charset=utf-8');
      
      const response = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: headers
      });
      
      // Cache the response for future use
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(err => {
        // console.warn('[ServiceWorker] Failed to cache JS module:', err);
      });
      
      return response;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    // console.warn('[ServiceWorker] Network failed for JS module, trying cache:', error);
    
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Ensure cached response has proper MIME type
      const headers = new Headers(cachedResponse.headers);
      headers.set('Content-Type', 'application/javascript; charset=utf-8');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    throw error;
  }
}

/**
 * Network First Strategy - For API calls and dynamic content
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok && shouldCache(request)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(err => {
        // console.warn('[ServiceWorker] Failed to cache response:', err);
      });
    }
    
    return networkResponse;
  } catch (error) {
    // console.warn('[ServiceWorker] Network failed, trying cache:', error);
    
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Last resort: Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || new Response('Offline', { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    throw error;
  }
}

/**
 * Cache First Strategy - For static assets
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && shouldCache(request)) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(err => {
        // console.warn('[ServiceWorker] Failed to cache static resource:', err);
      });
    }
    
    return networkResponse;
  } catch (error) {
    // console.error('[ServiceWorker] Failed to fetch static resource:', error);
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy - For HTML pages
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Always fetch from network to update cache
  const networkPromise = fetch(request).then(response => {
    if (response.ok && shouldCache(request)) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then(c => c.put(request, response.clone())).catch(err => {
        // console.warn('[ServiceWorker] Failed to update cache:', err);
      });
    }
    return response;
  }).catch(error => {
    // console.warn('[ServiceWorker] Network update failed:', error);
    return null;
  });
  
  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || networkPromise;
}

// Handle messages from main thread
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(err => {
        event.ports[0].postMessage({ success: false, error: err.message });
      });
      break;
      
    default:
      // console.log('[ServiceWorker] Unknown message type:', type);
  }
});

/**
 * Utility function to clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(cacheNames.map(name => caches.delete(name)));
}

// Handle unexpected errors
self.addEventListener('error', event => {
  // console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  // console.error('[ServiceWorker] Unhandled promise rejection:', event.reason);
});

// console.log('[ServiceWorker] Script loaded successfully');
