/// <reference lib="webworker" />
// Service worker próprio (vite-plugin-pwa, injectManifest): precache do app e a fila offline no Background Sync
// (docs/queue.md, "Service worker").
import { createClient } from '@supabase/supabase-js';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { createAuthStorage } from '@/lib/auth-storage';
import type { Database } from '@/lib/database.types';
import { db } from '@/offline/db';
import {
  createSupabaseQueueApi,
  QUEUE_CHANNEL,
  runPass,
  SYNC_TAG,
  syncInWorker,
  wakeNetworkWaits,
  webLock,
} from '@/offline/queue';

declare const self: ServiceWorkerGlobalScope;

/** Background Sync ainda não está nos tipos do TypeScript. */
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// Sem sinal, qualquer rota do app (o técnico abre direto numa O.S.) responde com o index.html do precache.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Versão nova esperando: entra quando a página pede (o técnico tocou em "Atualizar").
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

// A mesma sessão da página (IndexedDB). O worker não lê links do Auth nem renova por timer: renova quando uma
// chamada precisa, e a corrida com a página é resolvida pelo supabase-js e pelo servidor (docs/queue.md, Decisões).
const supabase = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { storage: createAuthStorage(), persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
});
const api = createSupabaseQueueApi(supabase);
const lock = webLock();
const clock = { now: () => Date.now() };

async function sessionUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

self.addEventListener('sync', (event) => {
  const sync = event as SyncEvent;
  if (sync.tag !== SYNC_TAG) return;
  const channel = new BroadcastChannel(QUEUE_CHANNEL);
  sync.waitUntil(
    syncInWorker({
      sessionUserId,
      wake: (userId) => wakeNetworkWaits(db, userId),
      pass: (userId) => runPass({ db, api, lock, clock, userId }),
      post: (message) => channel.postMessage(message),
    }).finally(() => channel.close()),
  );
});
