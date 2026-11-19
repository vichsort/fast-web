import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { supabaseUrl } from './backend';

/**
 * Sem o stack local do backend, nada aqui faz sentido: avisa antes de rodar o primeiro teste. A chave de serviço do
 * stack local (só para criar usuários de teste, `support/backend.ts`) vem do `supabase status` e chega aos workers
 * pelo ambiente.
 */
export default async function globalSetup() {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`);
    if (res.ok) {
      process.env.E2E_SERVICE_ROLE_KEY ??= serviceRoleKey();
      return;
    }
  } catch {
    // cai no erro abaixo
  }
  throw new Error(
    `Stack local do backend fora do ar em ${supabaseUrl || '(VITE_SUPABASE_URL vazio)'}: rode \`npm run db:start\` em ../fast.`,
  );
}

function serviceRoleKey(): string {
  const env = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
    cwd: resolve(process.cwd(), '../fast'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const key = /^SERVICE_ROLE_KEY="?([^"\n]+)"?$/m.exec(env)?.[1];
  if (!key) throw new Error('SERVICE_ROLE_KEY ausente no `supabase status` de ../fast.');
  return key;
}
