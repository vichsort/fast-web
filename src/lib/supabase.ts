// Cliente único do Supabase na página. A sessão fica no IndexedDB (auth-storage), onde o service worker a lê.
import { createClient } from '@supabase/supabase-js';
import { createAuthStorage } from './auth-storage';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ausentes (veja .env.example)');

export const supabase = createClient<Database>(url, anonKey, {
  auth: { storage: createAuthStorage(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
