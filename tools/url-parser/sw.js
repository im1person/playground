const CACHE_NAME = 'url-parser-v2';
const ASSETS = [
  './',
  './index.html',
  './parser.js',
  './icon-512.png',
  './manifest.json',
  './js/state.js',
  './js/utils.js',
  './js/url-core.js',
  './js/youtube.js',
  './js/history.js',
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
// 1. Check cache for immediate response
// 2. Always fetch from network in background to update cache for next time
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If valid response, update cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Silent fail for network fetch
        });

        // Return cached response instantly, or wait for network if not in cache
        return cachedResponse || fetchPromise;
      });
    })
  );
});
