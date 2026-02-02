const CACHE_NAME = 'travel-tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './icon-512.png',
  './manifest.json',
  './js/app.js',
  './js/dashboard.js',
  './js/store.js',
  './js/ui.js',
  './js/utils.js',
  '../../assets/style.css',
  '../../assets/header.js',
  '../../assets/theme-toggle.js',
  '../../assets/locale-menu.js'
];

// Install event - caching assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Caching assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleaning up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Check if valid http/https request
          if (networkResponse && networkResponse.status === 200 && (event.request.url.startsWith('http') || event.request.url.startsWith('https'))) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Silent fail for network fetch
        });
        return cachedResponse || fetchPromise;
      });
    })
  );
});
