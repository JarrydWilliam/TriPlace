// Production update worker for automatic deployment propagation
const CACHE_NAME = `triplace-cache-${Date.now()}`;
const STATIC_CACHE = `triplace-static-${Date.now()}`;
const API_CACHE = `triplace-api-${Date.now()}`;

// Critical assets that must be cached
const CRITICAL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/offline.html'
];

// API endpoints that can be cached
const CACHEABLE_APIS = [
  '/api/communities',
  '/api/events',
  '/api/users'
];

// Install event - cache critical assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(CRITICAL_ASSETS);
      }),
      caches.open(STATIC_CACHE).then(cache => {
        // Cache will be populated as assets are requested
        return Promise.resolve();
      })
    ]).then(() => {
      console.log('Service Worker installed successfully');
      // Force activation to ensure immediate update
      return self.skipWaiting();
    })
  );
});

// Activate event - clean old caches and claim clients
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('triplace-') && 
                cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activated successfully');
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            message: 'New version available'
          });
        });
      });
    })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate' || 
      (request.method === 'GET' && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default: network first
  event.respondWith(fetch(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API can be cached
  const isCacheable = CACHEABLE_APIS.some(pattern => url.pathname.startsWith(pattern));
  
  if (!isCacheable) {
    return fetch(request);
  }

  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fall back to cache
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve from cache, but also update cache in background
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Ignore network errors when updating cache
    });
    
    return cachedResponse;
  }
  
  try {
    // Not in cache, fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Return offline fallback for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#666">Image Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Handle navigation with network-first, cache fallback
async function handleNavigation(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fall back to cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Last resort: return root page for SPA routing
    const rootCache = await cache.match('/');
    if (rootCache) {
      return rootCache;
    }
    
    // Ultimate fallback: offline page
    return caches.match('/offline.html') || new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Listen for update checks from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    checkForUpdates().then(hasUpdate => {
      event.ports[0].postMessage({ hasUpdate });
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Check for app updates
async function checkForUpdates() {
  try {
    const response = await fetch('/api/version', { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (response.ok) {
      const serverVersion = await response.text();
      
      // Compare with stored version
      const storedVersion = await self.registration.sync?.getTags()
        ?.find(tag => tag.startsWith('version:'))
        ?.split(':')[1];
      
      return serverVersion !== storedVersion;
    }
  } catch (error) {
    console.log('Update check failed:', error);
  }
  
  return false;
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline actions when connection is restored
  const cache = await caches.open(API_CACHE);
  const keys = await cache.keys();
  
  // Retry failed API requests
  for (const request of keys) {
    if (request.url.includes('POST') || request.url.includes('PUT') || request.url.includes('DELETE')) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        // Keep in cache for next sync
      }
    }
  }
}