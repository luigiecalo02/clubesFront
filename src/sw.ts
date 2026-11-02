/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[]
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

registerRoute(({ url }) => url.pathname.startsWith('/api/'), new NetworkOnly())

try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/api\//],
    }),
  )
} catch {
  // Precache may omit index.html in some builds; navigation still works online.
}

self.addEventListener('push', (event) => {
  let payload: {
    title?: string
    body?: string
    icon?: string
    data?: { url?: string; tipo?: string }
  } = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data?.text() }
  }

  const title = payload.title || 'Clubes'
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: payload.data || { url: '/eventos' },
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options)
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        client.postMessage({ type: 'clubes:notification' })
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = (event.notification.data as { url?: string } | undefined)?.url || '/eventos'
  const target = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await (client as WindowClient).navigate(target)
          }
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})

self.skipWaiting()
