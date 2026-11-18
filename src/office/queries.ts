// Leituras do escritório (TanStack Query), com a chave 'office' para as ações recarregarem tudo de uma vez.
import { useQuery } from '@tanstack/react-query';
import type { OrderFilters } from '@/mocks';
import {
  officeAudit,
  officeDashboard,
  officeGetClient,
  officeGetOrder,
  officeLateSupplements,
  officeListClients,
  officeListMembers,
  officeListOrders,
  officeTechnicians,
} from './mocks';

export const useOrders = (filters: OrderFilters = {}) =>
  useQuery({ queryKey: ['office', 'orders', filters], queryFn: () => officeListOrders(filters) });

export const useOrder = (id: string) =>
  useQuery({ queryKey: ['office', 'order', id], queryFn: () => officeGetOrder(id) });

export const useDashboard = () => useQuery({ queryKey: ['office', 'dashboard'], queryFn: () => officeDashboard() });

export const useLateSupplements = () =>
  useQuery({ queryKey: ['office', 'late-supplements'], queryFn: () => officeLateSupplements() });

export const useClients = (filters: { search?: string; includeDeleted?: boolean } = {}) =>
  useQuery({ queryKey: ['office', 'clients', filters], queryFn: () => officeListClients(filters) });

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
