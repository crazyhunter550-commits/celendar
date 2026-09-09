// Bump this whenever you change index.html / assets so old caches get replaced.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `clean-days-${CACHE_VERSION}`;

// Everything listed here is downloaded the moment the app is first opened,
// so the app keeps working with no internet afterwards.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('clean-days-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  // Page navigations: serve the cached shell first (works fully offline),
  // and quietly refresh the cache in the background when online.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const network = fetch(request)
          .then((response) => {
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', response.clone()));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Google Fonts (and any other same/cross-origin static asset): cache-first,
  // refresh in the background. Once cached, these load with no network at all.
  if (isGoogleFont || url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
});
