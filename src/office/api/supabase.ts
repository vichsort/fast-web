// API real do escritório sobre o @supabase/supabase-js: leituras diretas com relações embutidas, RPCs e Edge
// Functions (api.md do backend). Toda falha vira `ApiError` classificada; a tela trata pelo código (session.tsx).
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { DashboardCounts, LateSupplementItem, OrderDetail, OrderFilters, PersonRef } from '@/mocks';
import { ApiError, classifyFunctionError, classifyRpcError } from '@/offline/queue/errors';
import {
  type ClientRow,
  clientMatches,
  directWriteError,
  type OrderRow,
  orderMatches,
  toClientListItem,
  toOrderDetail,
} from '../derive';
import type { AddressInput, OrderInput } from '../mocks';
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

/**
 * Update direto (api.md): o RLS barra sem erro, com zero linhas, então pede a linha de volta e sem ela é `not_found`.
 * CHECK, UNIQUE e NOT NULL viram `invalid_input`.
 */
async function update<R extends Response>(query: PromiseLike<R>): Promise<Data<R>> {
  const { data, error, status } = await query;
  if (error) throw directWriteError(error, status);
  if (data === null) throw new ApiError('rule', 'not_found', 'not_found');
  return data as Data<R>;
}

const blankToNull = (v: string | null | undefined) => (v && v.trim() !== '' ? v.trim() : null);
/** Telefone só com dígitos, como os dados de exemplo (o link do WhatsApp e a busca usam os dígitos). */
const phoneDigits = (v: string | null) => blankToNull(v?.replace(/\D/g, '') ?? null);

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

/** Detalhe da O.S. por id ou número (o link do WhatsApp e a busca usam o número), com as URLs das fotos. */
async function officeGetOrder(id: string): Promise<OrderDetail | null> {
  const query = supabase
    .from('service_orders')
    .select(`${ORDER_SELECT}, ${HISTORY_SELECT}`)
    .eq('company_id', current().companyId);
  const row = (await maybe(
    (/^\d+$/.test(id) ? query.eq('order_number', Number(id)) : query.eq('id', id)).maybeSingle(),
  )) as unknown as OrderRow | null;
  if (!row) return null;
  const photoIds = row.executions.flatMap((e) => e.photos.map((p) => p.id));
  let urls = new Map<string, string>();
  try {
    urls = await photoUrls(photoIds);
  } catch (error) {
    // Sem as URLs (rede ou servidor), a O.S. abre mesmo assim; as fotos voltam ao recarregar.
    if (!(error instanceof ApiError) || !['network', 'server'].includes(error.errorClass)) throw error;
  }
  return toOrderDetail(row, Date.now(), urls);
}

const PHOTO_URL_BATCH = 100;

/** get_photo_urls (04): até 100 por chamada; a URL vale 5 minutos. */
async function photoUrls(ids: string[]): Promise<Map<string, string>> {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += PHOTO_URL_BATCH) batches.push(ids.slice(i, i + PHOTO_URL_BATCH));
  const results = await Promise.all(
    batches.map((photo_ids) => invoke<{ photo_id: string; url: string }[]>('get_photo_urls', { photo_ids })),
  );
  return new Map(results.flat().map((r) => [r.photo_id, r.url]));
}

async function createOrder(input: OrderInput & { id: string }, _actor: PersonRef) {
  // O gerador tipa o retorno como Record; a RPC devolve a linha de service_orders (03).
  const order = (await rpc('create_order', {
    p_id: input.id,
    p_company_id: current().companyId,
    p_client_id: input.client_id,
    p_client_address_id: input.client_address_id ?? undefined,
    p_service_type: input.service_type,
    p_title: input.title,
    p_instructions: blankToNull(input.instructions) ?? undefined,
    p_priority: input.priority,
    p_due_date: input.due_date ?? undefined,
    p_materials_notes: blankToNull(input.materials_notes) ?? undefined,
    p_assignee_ids: input.assignee_ids,
  })) as unknown as { id: string; order_number: number };
  return { id: order.id, order_number: order.order_number };
}

async function updateOrder(
  id: string,
  input: Omit<OrderInput, 'client_id' | 'materials_notes' | 'assignee_ids'>,
  _actor: PersonRef,
) {
  await rpc('update_order', {
    p_order_id: id,
    p_title: input.title,
    p_instructions: blankToNull(input.instructions) ?? undefined,
    p_priority: input.priority,
    p_due_date: input.due_date ?? undefined,
    p_service_type: input.service_type,
    p_client_address_id: input.client_address_id ?? undefined,
  });
}

async function setAssignees(id: string, ids: string[], _actor: PersonRef) {
  await rpc('set_assignees', { p_order_id: id, p_assignee_ids: ids });
}

async function updateMaterials(id: string, text: string | null, expected: string | null, _actor: PersonRef) {
  await rpc('update_materials_notes', {
    p_order_id: id,
    p_text: blankToNull(text) ?? undefined,
    p_expected: blankToNull(expected) ?? undefined,
  });
}

async function cancelOrder(id: string, reason: string, _actor: PersonRef) {
  await rpc('cancel_order', { p_order_id: id, p_reason: reason });
}

// ---------------------------------------------------------------- revisão (04)

async function reviewExecution(
  input: {
    orderId: string;
    executionId: string;
    decision: 'approved' | 'rejected';
    comment: string | null;
    seenUntil: string | null;
    simulateStale?: boolean;
  },
  _actor: PersonRef,
) {
  await rpc('review_execution', {
    p_execution_id: input.executionId,
    p_decision: input.decision,
    p_comment: blankToNull(input.comment) ?? undefined,
    p_seen_until: input.seenUntil ?? undefined,
  });
}

async function acknowledgeSupplements(orderId: string, until: string, _actor: PersonRef) {
  return rpc('acknowledge_supplements', { p_order_id: orderId, p_seen_until: until });
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

// ---------------------------------------------------------------- clientes (02)

const ADDRESS_COLUMNS =
  'id, company_id, client_id, label, street, number, complement, district, city, state, zip_code, reference, is_primary, created_at, deleted_at, deleted_by, delete_reason';

const CLIENT_SELECT = `*, addresses:client_addresses(${ADDRESS_COLUMNS}), orders:service_orders(status)`;

async function clientRows(filter: (q: ReturnType<typeof clientQuery>) => ReturnType<typeof clientQuery>) {
  return (await rows(filter(clientQuery()))) as unknown as ClientRow[];
}

function clientQuery() {
  return supabase.from('clients').select(CLIENT_SELECT).eq('company_id', current().companyId);
}

/** Clientes por nome; os excluídos só quando pedidos (api.md: "ativos" filtram no front). Busca no front. */
async function officeListClients(filters: { search?: string; includeDeleted?: boolean } = {}) {
  const found = await clientRows((q) => (filters.includeDeleted ? q : q.is('deleted_at', null)));
  return found
    .filter((c) => clientMatches(c, filters.search ?? ''))
    .map(toClientListItem)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

async function officeGetClient(id: string) {
  const [found, orders] = await Promise.all([clientRows((q) => q.eq('id', id)), officeListOrders({ client_id: id })]);
  const row = found[0];
  if (!row) return null;
  const { open_orders } = toClientListItem(row);
  return { ...row, orders, open_orders };
}

/** `p_address` de create_client e add_client_address (02, "Formato de endereço"). */
const addressPayload = (a: AddressInput) => ({
  label: blankToNull(a.label),
  zip_code: blankToNull(a.zip_code),
  street: a.street.trim(),
  number: blankToNull(a.number),
  complement: blankToNull(a.complement),
  district: blankToNull(a.district),
  city: a.city.trim(),
  state: a.state.trim(),
  reference: blankToNull(a.reference),
});

async function createClient(input: {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  address: AddressInput | null;
}) {
  const created = await rpc('create_client', {
    p_id: input.id,
    p_company_id: current().companyId,
    p_name: input.name.trim(),
    p_phone: phoneDigits(input.phone) ?? undefined,
    p_notes: blankToNull(input.notes) ?? undefined,
    p_address: input.address ? addressPayload(input.address) : undefined,
  });
  return created as unknown as { client_id: string; address_id: string | null };
}

async function updateClient(id: string, input: { name: string; phone: string | null; notes: string | null }) {
  return update(
    supabase
      .from('clients')
      .update({ name: input.name.trim(), phone: phoneDigits(input.phone), notes: blankToNull(input.notes) })
      .eq('id', id)
      .select('*')
      .maybeSingle(),
  );
}

async function addAddress(target: { id: string; clientId: string }, input: AddressInput, makePrimary: boolean) {
  return rpc('add_client_address', {
    p_id: target.id,
    p_client_id: target.clientId,
    p_address: addressPayload(input),
    p_make_primary: makePrimary,
  });
}

async function updateAddress(addressId: string, input: AddressInput) {
  return update(
    supabase
      .from('client_addresses')
      .update(addressPayload(input))
      .eq('id', addressId)
      .is('deleted_at', null)
      .select(ADDRESS_COLUMNS)
      .maybeSingle(),
  );
}

async function setPrimaryAddress(addressId: string) {
  await rpc('set_primary_address', { p_address_id: addressId });
  return addressId;
}

async function deleteAddress(addressId: string, reason: string, _actor: PersonRef) {
  return rpc('delete_client_address', { p_address_id: addressId, p_reason: reason });
}

async function deleteClient(id: string, reason: string, _actor: PersonRef) {
  return rpc('delete_client', { p_client_id: id, p_reason: reason });
}

// ---------------------------------------------------------------- empresa e usuário

async function officeCompany() {
  const company = await one(supabase.from('companies').select('*').eq('id', current().companyId).maybeSingle());
  if (bound) bound.timeZone = company.timezone;
  return company;
}

/** Técnicos com vínculo ativo, para atribuir e filtrar (03, R7). */
async function officeTechnicians(): Promise<PersonRef[]> {
  const found = await rows(
    supabase
      .from('company_members')
      .select(`user:profiles!company_members_user_id_fkey(${PERSON})`)
      .eq('company_id', current().companyId)
      .eq('role', 'technician')
      .is('deleted_at', null),
  );
  return found.map((m) => m.user).sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));
}

/** O RLS de `profiles` mostra quem divide a empresa, inclusive os removidos (01). */
async function officePeople(): Promise<PersonRef[]> {
  return rows(supabase.from('profiles').select(PERSON));
}

async function officeSessionUser(_role: 'owner' | 'manager') {
  return one(supabase.from('profiles').select('*').eq('id', current().userId).maybeSingle());
}

export const supabaseApi: OfficeApi = {
  officeListOrders,
  officeGetOrder,
  officeDashboard,
  officeLateSupplements,
  officeListClients,
  officeGetClient,
  officeListMembers: pending('officeListMembers'),
  officeTechnicians,
  officeAudit: pending('officeAudit'),
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
  updateCompany: pending('updateCompany'),
  inviteMember: pending('inviteMember'),
  updateMemberRole: pending('updateMemberRole'),
  removeMember: pending('removeMember'),
  updateProfile: pending('updateProfile'),
};
