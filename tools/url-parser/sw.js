const CACHE_NAME = 'url-parser-v1';
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

// Fetch event - offline-first (Cache then Network)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Handle potential errors (e.g., when offline and not in cache)
      });
    })
  );
});
