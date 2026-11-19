// Quem está logado na interface do técnico e o QueryClient da página: o TechnicianRuntime liga antes das telas.
import type { QueryClient } from '@tanstack/react-query';
import type { MemberRole } from '@/lib/enums';

export interface TechnicianContext {
  userId: string;
  companyId: string;
  role: MemberRole;
  queryClient: QueryClient;
}

let bound: TechnicianContext | null = null;

export function bindTechnician(context: TechnicianContext) {
  bound = context;
}

export function current(): TechnicianContext {
  if (!bound) throw new Error('technician api sem sessão ligada (TechnicianRuntime)');
  return bound;
}

export function currentOrNull(): TechnicianContext | null {
  return bound;
}
