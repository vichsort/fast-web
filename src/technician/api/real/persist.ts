// Cache das leituras do técnico no IndexedDB (offline.md: "Minhas O.S." abre sem sinal), um por usuário, no Dexie.
import type { QueryClient } from '@tanstack/react-query';
import { type PersistedClient, type Persister, persistQueryClient } from '@tanstack/react-query-persist-client';
import { supabase } from '@/lib/supabase';
import { db } from '@/offline/db';

/** No máximo 3 dias sem sinal (offline.md, premissas). */
const MAX_AGE = 3 * 24 * 60 * 60 * 1000;

function dexiePersister(userId: string): Persister {
  return {
    async persistClient(client: PersistedClient) {
      // Depois do logout (clearUser), uma gravação atrasada não pode trazer o cache de volta.
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id !== userId) return;
      await db.cache.put({ userId, value: JSON.stringify(client), savedAt: new Date().toISOString() });
    },
    async restoreClient() {
      const row = await db.cache.get(userId);
      return row ? (JSON.parse(row.value) as PersistedClient) : undefined;
    },
    async removeClient() {
      await db.cache.delete(userId);
    },
  };
}

/** Restaura e passa a gravar as leituras `['technician', …]` do usuário. Devolve [parar, restaurado]. */
export function persistTechnicianCache(queryClient: QueryClient, userId: string) {
  return persistQueryClient({
    queryClient,
    persister: dexiePersister(userId),
    maxAge: MAX_AGE,
    buster: userId,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.queryKey[0] === 'technician' && query.state.status === 'success',
    },
  });
}
