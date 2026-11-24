// Sessão e acesso do usuário logado: consulta ao servidor, cache para abrir sem sinal, logout com limpeza.
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { classifyRpcError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { type Access, type AccessLookup, type Membership, type ResolvedAccess, resolveAccess } from './access';
import { forgetOnUserChange } from './query-client';

/**
 * Sessão atual do Supabase; `ready` fica falso até a sessão guardada (ou a do link de email) ser lida. Troca de usuário
 * esquece as leituras em memória antes de a tela ver a sessão nova (query-client.ts).
 */
export function useSession(): { session: Session | null; ready: boolean } {
  const queryClient = useQueryClient();
  const [state, setState] = useState<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
  useEffect(() => {
    const sessionChanged = forgetOnUserChange(queryClient);
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionChanged(session?.user.id ?? null);
      setState({ session, ready: true });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);
  return state;
}

/**
 * Vínculos ativos (mais antigo primeiro) e a flag de platform admin. O RLS esconde os vínculos de quem foi removido.
 * Sem as repetições do postgrest-js (1 + 2 + 4 s em falha de rede): sem resposta, o acesso guardado decide na hora.
 */
async function lookupAccess(userId: string): Promise<AccessLookup> {
  const [members, profile] = await Promise.all([
    supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at')
      .retry(false),
    supabase.from('profiles').select('is_platform_admin').eq('id', userId).maybeSingle().retry(false),
  ]);
  if (members.error) return { ok: false, errorClass: classifyRpcError(members.error, members.status).errorClass };
  if (profile.error) return { ok: false, errorClass: classifyRpcError(profile.error, profile.status).errorClass };
  const memberships: Membership[] = members.data.map((m) => ({ companyId: m.company_id, role: m.role }));
  return { ok: true, memberships, isPlatformAdmin: profile.data?.is_platform_admin ?? false };
}

const cacheKey = (userId: string) => `fast.access.${userId}`;

function readCachedAccess(userId: string): Access | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as Access) : null;
  } catch {
    return null;
  }
}

function writeCachedAccess(userId: string, access: Access): void {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(access));
  } catch {
    // Sem localStorage, o próximo acesso sem sinal só não terá cache.
  }
}

/** Acesso do usuário: o servidor decide quando responde; sem resposta, o último acesso guardado (access.ts). */
export function useAccess(userId: string | undefined) {
  return useQuery({
    queryKey: ['access', userId],
    enabled: Boolean(userId),
    networkMode: 'always',
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ResolvedAccess> => {
      const id = userId as string;
      const lookup = await lookupAccess(id);
      const access = resolveAccess(lookup, readCachedAccess(id));
      if (lookup.ok && access.kind !== 'offline_first_access') writeCachedAccess(id, access);
      return access;
    },
  });
}

/** Itens do usuário ainda na fila do aparelho (o código offline só carrega quando preciso). */
export async function pendingItems(userId: string): Promise<number> {
  const [{ pendingCount }, { db }] = await Promise.all([import('@/offline/queue'), import('@/offline/db')]);
  return pendingCount(db, userId);
}

/**
 * Logout e remoção do membro: encerra a sessão e apaga rascunhos, fotos, fila, cache e o acesso guardado (queue.md,
 * Q10). A sessão sai primeiro: o cache das leituras só grava com a sessão do usuário (persist.ts), e apagar antes
 * deixava uma gravação no meio do logout trazer o cache de volta.
 */
export async function signOutAndWipe(userId: string): Promise<void> {
  const [{ clearUser }, { db }] = await Promise.all([import('@/offline/queue'), import('@/offline/db')]);
  const { error } = await supabase.auth.signOut();
  if (error) await supabase.auth.signOut({ scope: 'local' });
  await clearUser(db, userId);
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {
    // nada guardado
  }
}

/**
 * "Entrar de novo" com a fila parada pedindo login (e2e.md, P3): encerra só a sessão deste aparelho e não apaga nada.
 * Entrando com a mesma conta, a fila sai (queue.md, Q3); com outra, os dados ficam no aparelho, fora da vista.
 */
export async function signOutKeepingData(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}
