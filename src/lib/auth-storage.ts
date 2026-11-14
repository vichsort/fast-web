// Sessão do Supabase no IndexedDB, não no localStorage: o service worker (fila offline com o Background Sync)
// não enxerga o localStorage e precisa da mesma sessão que a página.
import Dexie, { type EntityTable } from 'dexie';

interface Entry {
  key: string;
  value: string;
}

/** O formato de `auth.storage` do supabase-js (aceita promessas). */
export interface AuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

class AuthDb extends Dexie {
  entries!: EntityTable<Entry, 'key'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ entries: 'key' });
  }
}

export function createAuthStorage(name = 'fast-auth'): AuthStorage {
  const db = new AuthDb(name);
  return {
    async getItem(key) {
      return (await db.entries.get(key))?.value ?? null;
    },
    async setItem(key, value) {
      await db.entries.put({ key, value });
    },
    async removeItem(key) {
      await db.entries.delete(key);
    },
  };
}
