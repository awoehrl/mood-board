// Service worker for PWA + share target + update detection
self.addEventListener('install', () => {
  // Don't skipWaiting — let the app decide when to activate
})

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// App can tell us to activate via postMessage
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
})

// Handle share target navigations
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.pathname === '/share') {
    e.respondWith(fetch('/share.html'))
    return
  }
})
