// Sessão e acesso do usuário logado: consulta ao servidor, cache para abrir sem sinal, logout com limpeza.
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { classifyRpcError } from '@/lib/errors';
import { accountBanned, supabase } from '@/lib/supabase';
import {
  type Access,
  type AccessLookup,
  cacheableAccess,
  type Invite,
  type Membership,
  type ResolvedAccess,
  resolveAccess,
} from './access';
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
    let wiping = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Conta banida (06, R8): sem token não dá para conferir o vínculo; faz o mesmo que a remoção detectada.
      const banned = accountBanned();
      if (!session && banned) {
        if (!wiping) void wipeUser(banned).then(() => window.location.replace('/login?removed=true'));
        wiping = true;
        return;
      }
      sessionChanged(session?.user.id ?? null);
      setState({ session, ready: true });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);
  return state;
}

/**
 * Vínculos ativos e aceitos (mais antigo primeiro), a flag de platform admin e, sem vínculo, os convites pendentes
 * (06, R10). O RLS esconde os vínculos de quem foi removido. Sem as repetições do postgrest-js (1 + 2 + 4 s em falha de
 * rede): sem resposta, o acesso guardado decide na hora.
 */
async function lookupAccess(userId: string): Promise<AccessLookup> {
  const [members, profile] = await Promise.all([
    supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .is('deleted_at', null)
      .order('created_at')
      .retry(false),
    supabase.from('profiles').select('is_platform_admin').eq('id', userId).maybeSingle().retry(false),
  ]);
  if (members.error) return { ok: false, errorClass: classifyRpcError(members.error, members.status).errorClass };
  if (profile.error) return { ok: false, errorClass: classifyRpcError(profile.error, profile.status).errorClass };
  const memberships: Membership[] = members.data.map((m) => ({ companyId: m.company_id, role: m.role }));
  let invites: Invite[] = [];
  if (memberships.length === 0) {
    const pending = await supabase.rpc('my_invites').retry(false);
    if (pending.error) return { ok: false, errorClass: classifyRpcError(pending.error, pending.status).errorClass };
    invites = pending.data.map((i) => ({ memberId: i.member_id, companyName: i.company_name, role: i.role }));
  }
  return { ok: true, memberships, isPlatformAdmin: profile.data?.is_platform_admin ?? false, invites };
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
      if (lookup.ok && access.kind !== 'offline_first_access' && cacheableAccess(access)) writeCachedAccess(id, access);
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
  const { error } = await supabase.auth.signOut();
  if (error) await supabase.auth.signOut({ scope: 'local' });
  await wipeUser(userId);
}

/** Aceita o próprio convite pendente (06, R10); a falha vira `ApiError` classificada. */
export async function acceptInvite(memberId: string): Promise<void> {
  const { error, status } = await supabase.rpc('accept_invite', { p_member_id: memberId });
  if (error) throw classifyRpcError(error, status);
}

/** Recusa o próprio convite pendente (06, R11). */
export async function declineInvite(memberId: string): Promise<void> {
  const { error, status } = await supabase.rpc('decline_invite', { p_member_id: memberId });
  if (error) throw classifyRpcError(error, status);
}

/**
 * Apaga do aparelho os dados do usuário: rascunhos, fotos, fila, cache e o acesso guardado (Q10). Também sem sair da
 * conta, quando ele perde o vínculo mas tem convite pendente: os dados da empresa antiga não ficam para a nova.
 */
export async function wipeUser(userId: string): Promise<void> {
  const [{ clearUser }, { db }] = await Promise.all([import('@/offline/queue'), import('@/offline/db')]);
  await clearUser(db, userId);
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {
    // nada guardado
  }
}

/**
 * "Entrar de novo" com a fila parada pedindo login: encerra só a sessão deste aparelho e não apaga nada.
 * Entrando com a mesma conta, a fila sai (queue.md, Q3); com outra, os dados ficam no aparelho, fora da vista.
 */
export async function signOutKeepingData(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}
