/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

// IMPORTANTE: OneSignal SDK DEVE ser importado PRIMEIRO, antes de qualquer outro código
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { createHandlerBoundToURL } from 'workbox-precaching';

// Auto-atualização e claim de clientes
self.skipWaiting();
clientsClaim();

// Limpa caches antigos
cleanupOutdatedCaches();

// Precache dos assets (injetado pelo vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// Navigation route com fallback para index.html
const navigationRoute = new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/OneSignalSDKWorker\.js$/],
});
registerRoute(navigationRoute);

// Cache para Supabase
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache para tiles do mapa
registerRoute(
  ({ url }) => url.hostname.includes('openstreetmap.org'),
  new CacheFirst({
    cacheName: 'map-tiles-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache para OneSignal CDN
registerRoute(
  ({ url }) => url.hostname === 'cdn.onesignal.com',
  new CacheFirst({
    cacheName: 'onesignal-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);
