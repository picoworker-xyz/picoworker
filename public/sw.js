// Minimal service worker: makes the app installable and keeps the shell
// reachable offline. Data always goes to the network (balances and tasks must
// never be stale); only navigation falls back to the cached shell.
const CACHE = 'picoworker-shell-v4'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Build assets are content-hashed, so a given URL never changes contents and
  // is safe to serve from cache indefinitely. Caching them is about correctness
  // more than speed: the cached shell below references specific hashed
  // filenames, and after a deploy those files no longer exist on the server.
  // Without them cached, falling back to that shell yields HTML whose CSS 404s
  // and the page renders completely unstyled.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit
          ?? fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
            }
            return res
          }),
      ),
    )
    return
  }

  // App navigation: network first, cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match('/')),
    )
  }
})
