const CACHE_NAME = 'triplace-v2';
const CACHE_VERSION = '2.0.0';
const STATIC_CACHE = `triplace-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `triplace-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/assets/logo.png'
];

// Install event - cache static assets and skip waiting
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached, skipping waiting');
        return self.skipWaiting(); // Force immediate activation
      })
  );
});

// Activate event - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Service worker activated and claimed clients');
      // Notify all clients about the update
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            message: 'Service worker updated and activated'
          });
        });
      });
    })
  );
});

// Fetch event - network first with cache fallback for dynamic content
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first, no cache for dynamic data
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return offline response for API failures
          return new Response(
            JSON.stringify({ offline: true, message: 'You are offline' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
  } else if (STATIC_ASSETS.includes(url.pathname)) {
    // Static assets - cache first
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          return cachedResponse || fetch(request);
        })
    );
  } else {
    // Other requests - network first with cache fallback
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful responses
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache when network fails
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || new Response(
                '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
        })
    );
  }
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting as requested');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    console.log('[SW] Checking for updates');
    // Force update check by registering again
    event.source.postMessage({
      type: 'UPDATE_CHECKING',
      message: 'Checking for updates...'
    });
  }
});

// Periodic background sync for updates (when supported)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'app-update-check') {
    event.waitUntil(
      // Check for app updates
      fetch('/')
        .then(() => {
          console.log('[SW] Update check completed');
        })
        .catch(() => {
          console.log('[SW] Update check failed - offline');
        })
    );
  }
});

// Push notification handling (for future update notifications)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  if (event.data) {
    const data = event.data.json();
    
    if (data.type === 'app-update') {
      event.waitUntil(
        self.registration.showNotification('TriPlace Update Available', {
          body: data.message || 'A new version of TriPlace is available!',
          icon: '/assets/logo.png',
          badge: '/assets/logo.png',
          tag: 'app-update',
          requireInteraction: true,
          actions: [
            {
              action: 'update',
              title: 'Update Now'
            },
            {
              action: 'dismiss',
              title: 'Later'
            }
          ]
        })
      );
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'update') {
    // Open the app and trigger update
    event.waitUntil(
      clients.openWindow('/').then((client) => {
        if (client) {
          client.postMessage({
            type: 'FORCE_UPDATE',
            message: 'Updating app...'
          });
        }
      })
    );
  }
});