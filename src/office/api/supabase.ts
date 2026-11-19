// API real do escritório sobre o @supabase/supabase-js: leituras diretas com relações embutidas, RPCs e Edge
// Functions (api.md do backend). Toda falha vira `ApiError` classificada; a tela trata pelo código (session.tsx).
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { DashboardCounts, LateSupplementItem, OrderDetail, OrderFilters } from '@/mocks';
import { ApiError, classifyFunctionError, classifyRpcError } from '@/offline/queue/errors';
import { type OrderRow, orderMatches, toOrderDetail } from '../derive';
import type { OfficeApi } from './types';

type Functions = Database['public']['Functions'];

// ---------------------------------------------------------------- sessão

/** Quem está logado e em qual empresa: o layout liga antes de as telas lerem (layout.tsx). */
let bound: { userId: string; companyId: string; timeZone: string } | null = null;

export function bindOfficeSession(session: { userId: string; companyId: string }) {
  bound = { ...session, timeZone: bound?.companyId === session.companyId ? bound.timeZone : 'UTC' };
}

function current() {
  if (!bound) throw new ApiError('bug', null, 'office api sem sessão ligada');
  return bound;
}

// ---------------------------------------------------------------- chamadas

type Response = { data: unknown; error: PostgrestError | null; status: number };
type Data<R extends Response> = Exclude<R['data'], null>;

async function maybe<R extends Response>(query: PromiseLike<R>): Promise<Data<R> | null> {
  const { data, error, status } = await query;
  if (error) throw classifyRpcError(error, status);
  return (data ?? null) as Data<R> | null;
}

/** Uma linha que tem de existir; sem ela (o RLS esconde ou foi apagada), `not_found`. */
async function one<R extends Response>(query: PromiseLike<R>): Promise<Data<R>> {
  const data = await maybe(query);
  if (data === null) throw new ApiError('rule', 'not_found', 'not_found');
  return data;
}

async function rows<R extends Response>(query: PromiseLike<R>): Promise<Data<R>> {
  return ((await maybe(query)) ?? []) as Data<R>;
}

async function rpc<F extends keyof Functions>(fn: F, args: Functions[F]['Args']): Promise<Functions[F]['Returns']> {
  const { data, error, status } = await supabase.rpc(fn, args);
  if (error) throw classifyRpcError(error, status);
  return data as Functions[F]['Returns'];
}

export async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw await classifyFunctionError(error);
  return data as T;
}

/** Ainda sem integração: a tela mostra o erro genérico em vez de fingir que gravou. */
const pending =
  (name: string) =>
  async (..._args: unknown[]): Promise<never> => {
    throw new ApiError('bug', null, `${name}: integração pendente`);
  };

// ---------------------------------------------------------------- O.S.

const PERSON = 'id, full_name';

/** O que as telas do escritório embutem numa O.S. (derive.ts, OrderRow). */
const ORDER_SELECT = `*,
  client:clients!service_orders_client_id_fkey(*),
  client_address:client_addresses!service_orders_client_address_id_fkey(id, company_id, client_id, label, street, number, complement, district, city, state, zip_code, reference, is_primary, created_at, deleted_at, deleted_by, delete_reason),
  created_by_ref:profiles!service_orders_created_by_fkey(${PERSON}),
  assignments:service_order_assignees(*, user:profiles!service_order_assignees_user_id_fkey(${PERSON})),
  executions:service_order_executions(*,
    submitter:profiles!service_order_executions_submitted_by_fkey(${PERSON}),
    reviewer:profiles!service_order_executions_reviewed_by_fkey(${PERSON}),
    acknowledger:profiles!service_order_executions_acknowledged_by_fkey(${PERSON}),
    photos:service_order_photos(*))`;

const HISTORY_SELECT = `history:service_order_history(*, actor:profiles!service_order_history_actor_id_fkey(${PERSON}))`;

const OVERDUE_STATUSES = ['open', 'in_progress', 'rejected'] as const;

/**
 * O banco filtra o que é coluna da O.S. (status, prioridade, tipo, cliente, atrasada); busca, técnico, sem técnico
 * e prazo no fuso da empresa ficam no `orderMatches`, o mesmo dos dados de exemplo. Mais nova primeiro.
 */
async function officeListOrders(filters: OrderFilters = {}): Promise<OrderDetail[]> {
  let query = supabase.from('service_orders').select(ORDER_SELECT).eq('company_id', current().companyId);
  if (filters.status?.length) query = query.in('status', filters.status);
  if (filters.priority?.length) query = query.in('priority', filters.priority);
  if (filters.service_type?.length) query = query.in('service_type', filters.service_type);
  if (filters.client_id) query = query.eq('client_id', filters.client_id);
  if (filters.overdue) query = query.lt('due_at', new Date().toISOString()).in('status', [...OVERDUE_STATUSES]);
  const found = await rows(query.order('order_number', { ascending: false }));
  const now = Date.now();
  return (found as unknown as OrderRow[])
    .map((row) => toOrderDetail(row, now))
    .filter((o) => orderMatches(o, filters, current().timeZone));
}

/** Detalhe da O.S. por id ou número (o link do WhatsApp e a busca usam o número). */
async function officeGetOrder(id: string): Promise<OrderDetail | null> {
  const query = supabase
    .from('service_orders')
    .select(`${ORDER_SELECT}, ${HISTORY_SELECT}`)
    .eq('company_id', current().companyId);
  const row = await maybe((/^\d+$/.test(id) ? query.eq('order_number', Number(id)) : query.eq('id', id)).maybeSingle());
  return row ? toOrderDetail(row as unknown as OrderRow, Date.now()) : null;
}

// ---------------------------------------------------------------- dashboard (05)

async function officeDashboard(): Promise<DashboardCounts> {
  const counts = await rpc('get_dashboard', { p_company_id: current().companyId });
  return counts as unknown as DashboardCounts;
}

/** Complementos tardios sem ciência (04, R11), mais recente primeiro, com a O.S. de cada um. */
async function officeLateSupplements(): Promise<LateSupplementItem[]> {
  const late = await rows(
    supabase
      .from('service_order_executions')
      .select('service_order_id')
      .eq('company_id', current().companyId)
      .eq('is_late', true)
      .is('acknowledged_at', null),
  );
  const ids = [...new Set(late.map((e) => e.service_order_id))];
  if (ids.length === 0) return [];
  const found = await rows(supabase.from('service_orders').select(ORDER_SELECT).in('id', ids));
  const now = Date.now();
  return (found as unknown as OrderRow[])
    .map((row) => toOrderDetail(row, now))
    .flatMap((order) =>
      order.attempts
        .flatMap((a) => a.supplements)
        .filter((s) => s.is_late && s.acknowledged_at === null)
        .map((supplement) => ({ order, supplement })),
    )
    .sort((a, b) => Date.parse(b.supplement.received_at) - Date.parse(a.supplement.received_at));
}

// ---------------------------------------------------------------- empresa e usuário

async function officeCompany() {
  const company = await one(supabase.from('companies').select('*').eq('id', current().companyId).maybeSingle());
  if (bound) bound.timeZone = company.timezone;
  return company;
}

async function officeSessionUser(_role: 'owner' | 'manager') {
  return one(supabase.from('profiles').select('*').eq('id', current().userId).maybeSingle());
}

export const supabaseApi: OfficeApi = {
  officeListOrders,
  officeGetOrder,
  officeDashboard,
  officeLateSupplements,
  officeListClients: pending('officeListClients'),
  officeGetClient: pending('officeGetClient'),
  officeListMembers: pending('officeListMembers'),
  officeTechnicians: pending('officeTechnicians'),
  officeAudit: pending('officeAudit'),
  officeCompany,
  officeSessionUser,
  createOrder: pending('createOrder'),
  updateOrder: pending('updateOrder'),
  setAssignees: pending('setAssignees'),
  updateMaterials: pending('updateMaterials'),
  cancelOrder: pending('cancelOrder'),
  reviewExecution: pending('reviewExecution'),
  acknowledgeSupplements: pending('acknowledgeSupplements'),
  createClient: pending('createClient'),
  updateClient: pending('updateClient'),
  addAddress: pending('addAddress'),
  updateAddress: pending('updateAddress'),
  setPrimaryAddress: pending('setPrimaryAddress'),
  deleteAddress: pending('deleteAddress'),
  deleteClient: pending('deleteClient'),
  updateCompany: pending('updateCompany'),
  inviteMember: pending('inviteMember'),
  updateMemberRole: pending('updateMemberRole'),
  removeMember: pending('removeMember'),
  updateProfile: pending('updateProfile'),
};
