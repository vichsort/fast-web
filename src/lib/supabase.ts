// Cliente único do Supabase na página. A sessão fica no IndexedDB (auth-storage), onde o service worker a lê.
import { createClient } from '@supabase/supabase-js';
import { authLinkError, authLinkType } from '@/app/access';
import { createAuthStorage } from './auth-storage';
import type { Database } from './database.types';
import { authTimeoutFetch, signalingFetch } from './supabase-fetch';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ausentes (veja .env.example)');

// Link de email do Auth com que o app abriu, lido antes de o supabase-js limpar o hash.
let pendingLink = authLinkType(window.location.hash);

/** Convite ou recuperação ainda sem senha salva: a raiz manda para "definir senha" até `clearAuthLink`. */
export const pendingAuthLink = () => pendingLink;
export const clearAuthLink = () => {
  pendingLink = null;
};

/** O app abriu por um link de email expirado ou já usado: o login avisa. */
export const authLinkFailed = authLinkError(window.location.hash);

const responseListeners = new Set<() => void>();

/** Avisa a cada resposta HTTP do Supabase (indício de conexão para a fila do técnico, docs/queue.md Q7). */
export function onSupabaseResponse(listener: () => void): () => void {
  responseListeners.add(listener);
  return () => responseListeners.delete(listener);
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { storage: createAuthStorage(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: {
    fetch: signalingFetch(
      authTimeoutFetch((...args) => fetch(...args)),
      () => {
        for (const listener of responseListeners) listener();
      },
    ),
  },
});
