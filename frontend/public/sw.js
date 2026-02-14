const CACHE_NAME = 'agent-marketplace-v1'
const OFFLINE_URL = '/offline'

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/offline'
]

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching assets')
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Cache strategy helpers
const CACHE_STRATEGIES = {
  // Network First: Try network, fallback to cache (API calls)
  networkFirst: async (request) => {
    try {
      const networkResponse = await fetch(request)
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
      return networkResponse
    } catch (error) {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
      throw error
    }
  },

  // Cache First: Try cache, fallback to network (static assets)
  cacheFirst: async (request) => {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    const networkResponse = await fetch(request)
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, networkResponse.clone())
    return networkResponse
  },

  // Stale While Revalidate: Serve cache, update in background
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    const fetchPromise = fetch(request).then((networkResponse) => {
      cache.put(request, networkResponse.clone())
      return networkResponse
    })
    
    return cachedResponse || fetchPromise
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return
  }

  // API requests: NetworkFirst with offline fallback
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      CACHE_STRATEGIES.networkFirst(request).catch(() => {
        // Return offline page or JSON error
        return request.headers.get('Accept')?.includes('application/json')
          ? new Response(JSON.stringify({ error: 'Offline', message: 'No network connection' }), {
              headers: { 'Content-Type': 'application/json' }
            })
          : caches.match(OFFLINE_URL)
      })
    )
    return
  }

  // Static assets: CacheFirst
  if (/\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request))
    return
  }

  // JavaScript and CSS: StaleWhileRevalidate
  if (/\.(?:js|css)$/i.test(url.pathname)) {
    event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request))
    return
  }

  // HTML pages: NetworkFirst with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      CACHE_STRATEGIES.networkFirst(request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Default: NetworkFirst
  event.respondWith(CACHE_STRATEGIES.networkFirst(request))
})

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received', event)
  
  let data = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    data: {}
  }

  if (event.data) {
    try {
      data = { ...data, ...JSON.parse(event.data.text()) }
    } catch (e) {
      console.error('[Service Worker] Error parsing push data', e)
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: data.data,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked', event)
  
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const url = event.notification.data.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Handle messages from client
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls)
      })
    )
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync', event.tag)
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      // Sync offline data when back online
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_OFFLINE_DATA'
          })
        })
      })
    )
  }
})

// Periodic background sync (supported in modern browsers)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-updates') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        // Check for updates
        console.log('[Service Worker] Checking for updates')
      })
    )
  }
})

console.log('[Service Worker] Script loaded')
