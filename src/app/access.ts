// Qual interface abrir depois do login (docs/screens.md) e o que fazer sem sinal. Funções puras.
import type { Database } from '@/lib/database.types';
import type { ErrorClass } from '@/offline/queue/errors';

export type MemberRole = Database['public']['Enums']['member_role'];

export interface Membership {
  companyId: string;
  role: MemberRole;
}

export type Access =
  | { kind: 'technician' | 'office'; companyId: string; role: MemberRole }
  | { kind: 'platform_admin' }
  | { kind: 'no_access' };

/** O que a tela mostra: o acesso, ou o primeiro acesso sem sinal (sem nada guardado no aparelho). */
export type ResolvedAccess = Access | { kind: 'offline_first_access' };

/**
 * Vínculos ativos (mais antigo primeiro) → interface. Mais de uma empresa: vale o vínculo mais antigo (sem troca
 * de empresa no MVP). Sem vínculo: removido ou empresa excluída, exceto o platform admin, que não tem tela no MVP.
 */
export function accessFrom(memberships: Membership[], isPlatformAdmin: boolean): Access {
  const first = memberships[0];
  if (!first) return isPlatformAdmin ? { kind: 'platform_admin' } : { kind: 'no_access' };
  return { kind: first.role === 'technician' ? 'technician' : 'office', companyId: first.companyId, role: first.role };
}

export type AccessLookup =
  | { ok: true; memberships: Membership[]; isPlatformAdmin: boolean }
  | { ok: false; errorClass: ErrorClass };

/**
 * Online, o servidor decide (inclusive a remoção). Sem resposta, vale o último acesso guardado: falha de rede nunca
 * é tratada como remoção, senão o app apagaria a prova de quem só está sem sinal.
 */
export function resolveAccess(lookup: AccessLookup, cached: Access | null): ResolvedAccess {
  if (lookup.ok) return accessFrom(lookup.memberships, lookup.isPlatformAdmin);
  return cached ?? { kind: 'offline_first_access' };
}

/** Tipo do link de email do Auth (convite ou recuperação de senha), lido do hash da URL antes de o supabase-js limpá-lo. */
export function authLinkType(hash: string): 'invite' | 'recovery' | null {
  const type = new URLSearchParams(hash.replace(/^#/, '')).get('type');
  return type === 'invite' || type === 'recovery' ? type : null;
}

/** O Auth devolveu o link de email com erro (expirado ou já usado): `#error=...&error_code=...`. */
export function authLinkError(hash: string): boolean {
  return new URLSearchParams(hash.replace(/^#/, '')).has('error_code');
}
