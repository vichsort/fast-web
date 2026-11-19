// Ponto único de dados do escritório: as telas importam daqui, nunca de ../mocks nem do Supabase direto.
// A fonte sai de src/lib/data-source.ts (VITE_DATA_SOURCE=mock liga os dados de exemplo).
import { usingMocks } from '@/lib/data-source';
import * as mock from '../mocks';
import { bindOfficeSession, supabaseApi } from './supabase';
import type { OfficeApi } from './types';

const api: OfficeApi = usingMocks ? mock : supabaseApi;

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
export type { AddressInput, OrderInput } from '../mocks';
