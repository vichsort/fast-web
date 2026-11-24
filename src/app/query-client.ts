// Cliente do TanStack Query do app. O escritório trabalha online e lê listas inteiras: suas leituras valem 30 s
// (trocar de aba e voltar logo não relê tudo; depois disso, o foco relê). As ações recarregam na hora (session.tsx).
// O técnico fica no padrão (velho na hora): o cache restaurado do aparelho tem de se atualizar ao abrir com sinal.
import { QueryClient } from '@tanstack/react-query';

export const OFFICE_STALE_TIME = 30_000;

export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryDefaults(['office'], { staleTime: OFFICE_STALE_TIME });
  return queryClient;
}

/**
 * As chaves não levam o usuário: quando o usuário da sessão muda (logout, por qualquer caminho, ou outro login sem
 * recarregar), as leituras em memória do anterior saem. Sem isso, o próximo via os dados dele (até de outra empresa)
 * e o cache do técnico os gravava no Dexie do novo (revisão de segurança, C1).
 */
export function forgetOnUserChange(queryClient: QueryClient): (userId: string | null) => void {
  let current: string | null = null;
  return (userId) => {
    if (current !== null && current !== userId) queryClient.clear();
    current = userId;
  };
}
