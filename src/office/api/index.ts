// Ponto único de dados do escritório: as telas importam daqui, nunca de ../mocks nem do Supabase direto. As duas
// implementações cumprem `OfficeApi` (./types.ts); a fonte sai de src/lib/data-source.ts (VITE_DATA_SOURCE=mock).
import { usingMocks } from '@/lib/data-source';
import { bindOfficeSession, supabaseApi } from './supabase';
import type { OfficeApi } from './types';

// Dados de exemplo por import dinâmico, com a chave lida aqui mesmo (não pelo `usingMocks`): o Vite troca a chave por
// literal no módulo e o build de produção descarta o ramo antes de gerar os pedaços, então o mock nem é empacotado.
const api: OfficeApi = import.meta.env.VITE_DATA_SOURCE === 'mock' ? await import('../mocks') : supabaseApi;

export const {
  officeListOrders,
  officePendingOrders,
  officeGetOrder,
  officeDashboard,
  officeLateSupplements,
  officeListClients,
  officeGetClient,
  officeListMembers,
  officeTechnicians,
  officeAudit,
  officePeople,
  officeCompany,
  officeSessionUser,
  createOrder,
  updateOrder,
  setAssignees,
  updateMaterials,
  cancelOrder,
  reviewExecution,
  acknowledgeSupplements,
  createClient,
  updateClient,
  addAddress,
  updateAddress,
  setPrimaryAddress,
  deleteAddress,
  deleteClient,
  updateCompany,
  inviteMember,
  updateMemberRole,
  removeMember,
  updateProfile,
  lookupZip,
} = api;

/** Liga o usuário e a empresa da sessão real (os dados de exemplo usam o usuário de exemplo do papel). */
export const bindSession = usingMocks ? () => {} : bindOfficeSession;

export { addressText, seenUntil } from '../derive';
export type { AddressInput, OrderInput } from './types';
