// Cliente único do Supabase na página. A sessão fica no IndexedDB (auth-storage), onde o service worker a lê.
import { createClient } from '@supabase/supabase-js';
import { createAuthStorage } from './auth-storage';
import type { Database } from './database.types';
import { authTimeoutFetch, bannedFetch, signalingFetch } from './supabase-fetch';
import { VERSION_HEADERS } from './version';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ausentes (veja .env.example)');

const responseListeners = new Set<() => void>();

/** Avisa a cada resposta HTTP do Supabase (indício de conexão para a fila do técnico, docs/queue.md Q7). */
export function onSupabaseResponse(listener: () => void): () => void {
  responseListeners.add(listener);
  return () => responseListeners.delete(listener);
}

// A chave padrão do supabase-js, dita aqui para ler a sessão guardada quando a renovação é recusada.
const storageKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
const authStorage = createAuthStorage();
let bannedUser: string | null = null;

/**
 * Usuário cuja renovação da sessão foi recusada com `user_banned` (06, R8: saiu de todas as empresas), lido da sessão
 * guardada antes de o supabase-js apagá-la; `null` se não houve.
 */
export const accountBanned = () => bannedUser;

async function rememberBannedUser(): Promise<void> {
  try {
    const stored = await authStorage.getItem(storageKey);
    bannedUser = stored ? ((JSON.parse(stored) as { user?: { id?: string } }).user?.id ?? null) : null;
  } catch {
    bannedUser = null;
  }
}

export const supabase = createClient<Database>(url, anonKey, {
  // Sem links do Auth (o sistema não manda email): o hash de /link é o token do convite, não uma sessão.
  auth: { storage: authStorage, storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  global: {
    headers: VERSION_HEADERS,
    fetch: signalingFetch(
      bannedFetch(
        authTimeoutFetch((...args) => fetch(...args)),
        rememberBannedUser,
      ),
      () => {
        for (const listener of responseListeners) listener();
      },
    ),
  },
});
