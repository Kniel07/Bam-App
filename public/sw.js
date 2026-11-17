/*
 * Service worker for push notifications ONLY (CR-04).
 * Deliberately no fetch handler and no caching: private content is never
 * stored offline, and every page load goes through sign-in and RLS.
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let message = { title: 'Our Little Universe', body: 'Something is waiting for you ✨', url: '/', tag: 'general' }
  try {
    if (event.data) message = { ...message, ...event.data.json() }
  } catch {
    // Malformed payload: fall back to the generic message.
  }
  // Only same-site paths are followed (never an external URL from a payload).
  const isLocalPath = typeof message.url === 'string' && message.url.startsWith('/') && !message.url.startsWith('//')
  const url = isLocalPath ? message.url : '/'
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: message.tag,
      renotify: true,
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin))
      if (open) {
        open.navigate(url)
        return open.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
