const CACHE_NAME = 'triplace-v1.0.4';
const STATIC_CACHE = 'triplace-static-v1.0.4';
const DYNAMIC_CACHE = 'triplace-dynamic-v1.0.4';

// Community discovery API endpoints that should always be fresh for ChatGPT updates
const CHATGPT_DISCOVERY_ENDPOINTS = [
  '/api/communities/recommended',
  '/api/users',
  '/api/communities'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('TriPlace Service Worker: Installing with ChatGPT discovery support...');
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      // Notify clients that an update is available
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            message: 'New version available'
          });
        });
      })
    ])
  );
});

// Activate event - claim clients immediately for PWA updates
self.addEventListener('activate', (event) => {
  console.log('TriPlace Service Worker: Activating with ChatGPT community updates...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('TriPlace Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('TriPlace Service Worker: Claiming all clients for ChatGPT updates');
        return self.clients.claim();
      })
  );
});

// Fetch event - prioritize fresh ChatGPT community data for all users
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Always fetch fresh ChatGPT community discovery data
  if (CHATGPT_DISCOVERY_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    console.log('TriPlace Service Worker: Fetching fresh ChatGPT community data for:', url.pathname);
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone response for caching
          const responseClone = response.clone();
          
          // Cache successful ChatGPT responses
          if (response.ok) {
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          console.log('TriPlace Service Worker: Network failed, using cached ChatGPT data for:', url.pathname);
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Handle other requests normally
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});

// Message event - handle ChatGPT community refresh requests
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REFRESH_CHATGPT_COMMUNITIES') {
    console.log('TriPlace Service Worker: Refreshing ChatGPT community cache for all users');
    
    // Clear ChatGPT community cache to force fresh data
    caches.open(DYNAMIC_CACHE)
      .then((cache) => {
        CHATGPT_DISCOVERY_ENDPOINTS.forEach(endpoint => {
          cache.keys().then(keys => {
            keys.forEach(key => {
              if (key.url.includes(endpoint)) {
                cache.delete(key);
              }
            });
          });
        });
      });
    
    // Notify all clients about ChatGPT community updates
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CHATGPT_COMMUNITIES_REFRESHED',
          message: 'ChatGPT community recommendations updated'
        });
      });
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
    // Force update check by notifying about new version
    event.ports[0].postMessage({
      type: 'UPDATE_AVAILABLE',
      message: 'Checking for updates...'
    });
  }
});

// Background sync for ChatGPT community updates (PWA support)
self.addEventListener('sync', (event) => {
  if (event.tag === 'chatgpt-community-sync') {
    console.log('TriPlace Service Worker: Background syncing ChatGPT communities for PWA users');
    
    event.waitUntil(
      fetch('/api/communities/recommended')
        .then(response => {
          if (response.ok) {
            return caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put('/api/communities/recommended', response));
          }
        })
        .catch(error => {
          console.log('TriPlace Service Worker: ChatGPT background sync failed:', error);
        })
    );
  }
});

// Push notifications for ChatGPT community updates
self.addEventListener('push', (event) => {
  console.log('TriPlace Service Worker: ChatGPT community update notification received');
  
  const options = {
    body: 'New communities discovered based on your quiz responses!',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'chatgpt-community-update',
    data: {
      url: '/dashboard'
    },
    actions: [
      {
        action: 'open',
        title: 'View Communities'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('TriPlace - New Communities Found', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

console.log('TriPlace Service Worker: Ready for ChatGPT community discovery updates for all users including PWA installations');