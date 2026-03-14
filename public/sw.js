// Service worker for PWA install + share target
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Handle share target navigations
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Let the share.html page handle share target requests
  if (url.pathname === '/share') {
    e.respondWith(fetch('/share.html'))
    return
  }
})
