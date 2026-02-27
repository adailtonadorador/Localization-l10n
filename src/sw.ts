/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Ativa imediatamente e assume controle
self.skipWaiting();
clientsClaim();

// Limpa caches antigos
cleanupOutdatedCaches();

// Precache dos assets gerados pelo build
precacheAndRoute(self.__WB_MANIFEST);

// Cache para Supabase API (NetworkFirst - prioriza rede)
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 horas
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache para tiles de mapa (CacheFirst - prioriza cache)
registerRoute(
  ({ url }) => url.hostname.includes('openstreetmap.org'),
  new CacheFirst({
    cacheName: 'map-tiles-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// ============================================================================
// Web Push Notifications
// ============================================================================

// Tipo para os dados da notificação
interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// Evento de push recebido
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push recebido:', event);

  if (!event.data) {
    console.warn('[SW] Push sem dados');
    return;
  }

  let notificationData: PushNotificationData;

  try {
    notificationData = event.data.json();
  } catch {
    // Se não for JSON, usa o texto como body
    notificationData = {
      title: 'Sama Conecta',
      body: event.data.text(),
    };
  }

  const options: NotificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || '/pwa-192x192.png',
    badge: notificationData.badge || '/pwa-64x64.png',
    tag: notificationData.tag || 'default',
    data: {
      url: notificationData.url || '/',
      ...notificationData.data,
    },
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Evento de clique na notificação
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notificação clicada:', event);

  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma janela aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navega para a URL da notificação
          if ('navigate' in client) {
            return (client as WindowClient).navigate(url);
          }
          return client;
        }
      }
      // Se não tem janela aberta, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Evento de fechamento da notificação (sem clique)
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('[SW] Notificação fechada:', event);
});
