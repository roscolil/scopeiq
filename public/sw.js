// Service Worker for ScopeIQ - Performance Optimization
const CACHE_NAME = 'scopeiq-v1'
const STATIC_CACHE_NAME = 'scopeiq-static-v1'

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/src/main.tsx',
  '/src/App.tsx',
  '/pdf.worker.min.mjs',
  // Add other critical resources
]

// Resources to cache on demand
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:js|css|png|jpg|jpeg|svg|ico)$/,
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static resources')
        return cache.addAll(STATIC_RESOURCES)
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static resources', error)
      }),
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  // Ensure the service worker takes control immediately
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip API calls and dynamic content
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('amplify') ||
    url.hostname.includes('amazonaws.com')
  ) {
    return
  }

  // Handle static resources
  if (STATIC_RESOURCES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request)
      }),
    )
    return
  }

  // Handle dynamic resources (fonts, images, etc.)
  const shouldCache = DYNAMIC_CACHE_PATTERNS.some(pattern =>
    pattern.test(request.url),
  )

  if (shouldCache) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response
          }

          return fetch(request).then(networkResponse => {
            // Clone the response before caching
            const responseClone = networkResponse.clone()
            cache.put(request, responseClone)
            return networkResponse
          })
        })
      }),
    )
  }
})

// Handle background sync for offline functionality (future enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered')
    // Handle background sync events
  }
})

// Handle push notifications (future enhancement)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json()
    console.log('Service Worker: Push notification received', data)
    // Handle push notifications
  }
})
