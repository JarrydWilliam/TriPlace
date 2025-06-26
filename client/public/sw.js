const CACHE_NAME = `triplace-v${Date.now()}`;
const urlsToCache = [
  '/',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Handle navigation requests (Safari reload fix)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network request succeeds, return it
          return response;
        })
        .catch(() => {
          // If network fails, return cached root or fallback
          return caches.match('/') || 
                 caches.match(event.request) ||
                 new Response('<!DOCTYPE html><html><head><title>TriPlace</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;padding:20px;text-align:center;background:#0f172a;color:white}</style></head><body><h1>TriPlace</h1><p>Connecting...</p><script>setTimeout(()=>location.reload(),2000)</script></body></html>', {
                   headers: { 'Content-Type': 'text/html' }
                 });
        })
    );
    return;
  }

  // Handle other requests normally
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // Return fallback for failed requests
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
        return new Response('Network Error', { status: 408 });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});