const CACHE_NAME = 'samevibe-v1.0.2';
const STATIC_CACHE = 'samevibe-static-v1.0.2';
const DYNAMIC_CACHE = 'samevibe-dynamic-v1.0.2';

// API endpoints that should always be fresh
const FRESH_ENDPOINTS = [
  '/api/communities/recommended',
  '/api/users',
  '/api/communities'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('SameVibe Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'UPDATE_AVAILABLE', message: 'New version available' });
        });
      })
    ])
  );
});

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('SameVibe Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('SameVibe Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always fetch fresh community discovery data
  if (FRESH_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for all GET requests with cache fallback
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

// Message event - handle community refresh requests
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'REFRESH_COMMUNITIES' || event.data.type === 'REFRESH_CHATGPT_COMMUNITIES')) {
    console.log('SameVibe Service Worker: Refreshing community cache');

    caches.open(DYNAMIC_CACHE).then(cache => {
      FRESH_ENDPOINTS.forEach(endpoint => {
        cache.keys().then(keys => {
          keys.forEach(key => {
            if (key.url.includes(endpoint)) cache.delete(key);
          });
        });
      });
    });

    // Notify all clients that communities were refreshed
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'COMMUNITIES_REFRESHED', message: 'Community recommendations updated' });
      });
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
    event.ports[0]?.postMessage({ type: 'UPDATE_AVAILABLE', message: 'Checking for updates...' });
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'community-sync' || event.tag === 'chatgpt-community-sync') {
    console.log('SameVibe Service Worker: Background syncing communities');
    event.waitUntil(
      fetch('/api/communities/recommended')
        .then(response => {
          if (response.ok) {
            return caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put('/api/communities/recommended', response));
          }
        })
        .catch(error => console.log('SameVibe Service Worker: Background sync failed:', error))
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let payload = { title: 'SameVibe', body: 'New activity in your communities!', url: '/dashboard' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {}

  const options = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: 'samevibe-notification',
    data: { url: payload.url || '/dashboard' },
    actions: [{ action: 'open', title: 'Open SameVibe' }]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});

console.log('SameVibe Service Worker: Ready');