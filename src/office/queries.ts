// Leituras do escritório (TanStack Query), com a chave 'office' para as ações recarregarem tudo de uma vez.
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import type { ClientListItem, OfficeOrderListItem, OrderFilters } from '@/lib/views';
import {
  officeAudit,
  officeClientNames,
  officeDashboard,
  officeGetClient,
  officeGetOrder,
  officeLateSupplements,
  officeListClients,
  officeListMembers,
  officeListOrders,
  officePendingOrders,
  officePeople,
  officeTechnicians,
} from './api';
import { clientMatches, orderMatches, splitOrderFilters } from './derive';
import { useOffice } from './session';

/**
 * Lista de O.S.: a chave e a leitura levam só o que o banco filtra; busca, técnico, sem técnico e prazo (no fuso da
 * empresa) filtram o cache, sem reler a lista a cada tecla (screens-office.md, decisões).
 */
export function useOrders(filters: OrderFilters = {}) {
  const { timeZone } = useOffice();
  const { query, local } = splitOrderFilters(filters);
  const localKey = JSON.stringify(local);
  const select = React.useMemo(() => {
    const only = JSON.parse(localKey) as OrderFilters;
    return (rows: OfficeOrderListItem[]) => rows.filter((o) => orderMatches(o, only, timeZone));
  }, [localKey, timeZone]);
  return useQuery({ queryKey: ['office', 'orders', query], queryFn: () => officeListOrders(query), select });
}

/** Aguardando aprovação, com as tentativas: a lista acima é enxuta (docs/e2e.md, D4). */
export const usePendingOrders = () =>
  useQuery({ queryKey: ['office', 'pending-orders'], queryFn: () => officePendingOrders() });

export const useOrder = (id: string) =>
  useQuery({ queryKey: ['office', 'order', id], queryFn: () => officeGetOrder(id) });

export const useDashboard = () => useQuery({ queryKey: ['office', 'dashboard'], queryFn: () => officeDashboard() });

export const useLateSupplements = () =>
  useQuery({ queryKey: ['office', 'late-supplements'], queryFn: () => officeLateSupplements() });

/** Clientes: a chave e a leitura levam só "com excluídos"; a busca filtra o cache. */
export function useClients(filters: { search?: string; includeDeleted?: boolean } = {}) {
  const includeDeleted = filters.includeDeleted === true;
  const search = filters.search ?? '';
  const select = React.useCallback(
    (rows: ClientListItem[]) => (search.trim() ? rows.filter((c) => clientMatches(c, search)) : rows),
    [search],
  );
  return useQuery({
    queryKey: ['office', 'clients', { includeDeleted }],
    queryFn: () => officeListClients({ includeDeleted }),
    select,
  });
}

/** Id e nome de todos os clientes, inclusive excluídos: o filtro de cliente da lista de O.S. */
export const useClientNames = () =>
  useQuery({ queryKey: ['office', 'client-names'], queryFn: () => officeClientNames() });

export const useClient = (id: string | null) =>
  useQuery({
    queryKey: ['office', 'client', id],
    queryFn: () => officeGetClient(id ?? ''),
    enabled: id !== null,
  });

export const useMembers = (filters: { includeRemoved?: boolean } = {}) =>
  useQuery({ queryKey: ['office', 'members', filters], queryFn: () => officeListMembers(filters) });

export const useTechnicians = () =>
  useQuery({ queryKey: ['office', 'technicians'], queryFn: () => officeTechnicians() });

export const useAudit = () => useQuery({ queryKey: ['office', 'audit'], queryFn: () => officeAudit() });

/** Nome de uma pessoa por id (autor de exclusão, cancelamento, histórico); '—' enquanto carrega ou se não visível. */
export function usePersonName(): (id: string | null | undefined) => string {
  const people = useQuery({ queryKey: ['office', 'people'], queryFn: () => officePeople(), staleTime: 5 * 60_000 });
  const data = people.data;
  return React.useCallback((id) => (id ? (data?.find((p) => p.id === id)?.full_name ?? '—') : '—'), [data]);
}
