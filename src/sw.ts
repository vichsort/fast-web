/// <reference lib="webworker" />
// Service worker próprio (vite-plugin-pwa, injectManifest). Hoje só faz o precache do app; a fila offline
// entra aqui com o Background Sync (docs/queue.md).
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
