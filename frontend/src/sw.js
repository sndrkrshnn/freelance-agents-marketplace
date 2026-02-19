// Service Worker for PWA
// eslint-disable-next-line no-undef
const precacheManifest = self.__WB_MANIFEST || [];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic fetch handler - can be expanded for caching strategy
  event.respondWith(
    fetch(event.request).catch(() => {
      // Return offline fallback or cached response if available
      return new Response('Offline', { status: 503 });
    })
  );
});
