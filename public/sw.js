/* Service Worker — Ons Trouwplan */

const CACHE = 'otp-v1'
const STATIC = [
  '/bruiloft',
  '/offline',
]

// Install: pre-cache de shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC).catch(() => {}))
  )
  self.skipWaiting()
})

// Activate: verwijder oude caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: stale-while-revalidate voor statische assets; network-first voor de rest
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Sla niet-GET en externe origins over
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin && !url.hostname.endsWith('supabase.co')) return

  // Supabase API — network-first, geen cache
  if (url.hostname.endsWith('supabase.co')) {
    e.respondWith(fetch(request).catch(() => new Response('', { status: 503 })))
    return
  }

  // Next.js static bestanden (_next/static) — cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return res
        })
      )
    )
    return
  }

  // Navigatie-requests — network-first met offline fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached ?? caches.match('/bruiloft'))
      )
    )
  }
})

// Push-notificaties ontvangen
self.addEventListener('push', (e) => {
  let data = { title: 'Ons Trouwplan', body: 'Er is een update voor jullie bruiloft.' }
  try {
    data = e.data ? { ...data, ...e.data.json() } : data
  } catch {
    // ongeldige payload — gebruik fallback
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: data.url ?? '/bruiloft' },
      vibrate: [100, 50, 100],
    })
  )
})

// Notificatie aantikken opent de app
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = e.notification.data?.url ?? '/bruiloft'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes('/bruiloft'))
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    })
  )
})
