import { supabaseUrl } from './backend';

/** Sem o stack local do backend, nada aqui faz sentido: avisa antes de rodar o primeiro teste. */
export default async function globalSetup() {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`);
    if (res.ok) return;
  } catch {
    // cai no erro abaixo
  }
  throw new Error(
    `Stack local do backend fora do ar em ${supabaseUrl || '(VITE_SUPABASE_URL vazio)'}: rode \`npm run db:start\` em ../fast.`,
  );
}
