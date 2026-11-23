// Dados do escritório no scratch visual: uma cópia em memória dos dados de exemplo do kit (lidos pelas funções de
// @/mocks), para as ações (criar, aprovar, excluir…) mostrarem o efeito em todas as telas até recarregar a página.
// As leituras têm a forma das consultas reais; as ações imitam as RPCs e Edge Functions (03, 04, 02, 01, 06), inclusive
// os erros de regra que o banco devolveria. Nada sai do navegador. Na integração, cada função vira a chamada real.
import { ACTIVE_ORDER_STATUSES, type MemberRole } from '@/lib/enums';
import { ApiError } from '@/lib/errors';
import { calendarDay } from '@/lib/format';
import { blankToNull, phoneDigitsOrNull } from '@/lib/input';
import { isOverdue } from '@/lib/order-detail';
import type {
  AuditView,
  Client,
  ClientAddress,
  ClientDetail,
  ClientListItem,
  ClientName,
  Company,
  DashboardCounts,
  HistoryView,
  LateSupplementItem,
  MemberView,
  OfficeOrderListItem,
  OrderDetail,
  OrderQuery,
  PersonRef,
  Profile,
} from '@/lib/views';
import {
  getClient,
  getCompany,
  getOrder,
  getSessionUser,
  listAudit,
  listClients,
  listMembers,
  listOrders,
  MOCK_USER_IDS,
} from '@/mocks';
import { emails } from '@/mocks/data';
import type { AddressInput, OrderEdit, OrderInput } from './api/types';
import type { ZipLookup } from './api/viacep';
import { addressText, orderMatches, seenUntil } from './derive';

const LATENCY = 150;
const wait = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY));

/** Recusa por regra, com o código do catálogo (errors.md), como o banco devolveria. */
const fail = (code: string, details: unknown = null): never => {
  throw new ApiError('rule', code, code, details);
};

// ---------------------------------------------------------------- a cópia em memória

interface Store {
  company: Company;
  orders: OrderDetail[];
  clients: Omit<ClientDetail, 'orders'>[];
  members: MemberView[];
  audit: AuditView[];
}

let loading: Promise<Store> | null = null;
const store = () => {
  loading ??= load();
  return loading;
};

async function load(): Promise<Store> {
  const [company, orderList, clientList, members, audit, owner, manager] = await Promise.all([
    getCompany(),
    listOrders(),
    listClients({ includeDeleted: true }),
    listMembers({ includeRemoved: true }),
    listAudit(),
    getSessionUser('owner'),
    getSessionUser('manager'),
  ]);
  const orders = (await Promise.all(orderList.map((o) => getOrder(o.id)))).filter((o) => o !== null);
  const clients = (await Promise.all(clientList.map((c) => getClient(c.id))))
    .filter((c) => c !== null)
    .map(({ orders: _orders, ...client }) => client);
  profiles.set(owner.profile.id, owner.profile);
  profiles.set(manager.profile.id, manager.profile);
  return { company, orders, clients, members, audit };
}

const profiles = new Map<string, Profile>();
/** Email por usuário, só para o convite de exemplo achar quem já existe (no real, quem decide é o Auth). */
const memberEmails = new Map<string, string>(Object.entries(emails));
const now = () => new Date().toISOString();
const ref = (p: PersonRef): PersonRef => ({ id: p.id, full_name: p.full_name });

/** Recalcula os campos derivados (técnicos ativos, atrasada, tardios, cliente embutido). */
function view(s: Store, o: OrderDetail): OrderDetail {
  const client = s.clients.find((c) => c.id === o.client_id);
  return {
    ...o,
    client: client
      ? { ...o.client, name: client.name, phone: client.phone, notes: client.notes, deleted_at: client.deleted_at }
      : o.client,
    assignees: o.assignments.filter((a) => a.unassigned_at === null).map((a) => a.user),
    overdue: isOverdue(o, Date.now()),
    late_supplements_unseen: o.attempts.flatMap((a) => a.supplements).filter((x) => x.is_late && !x.acknowledged_at)
      .length,
  };
}

/** A linha da lista, na forma enxuta da consulta real (ORDER_LIST_SELECT em api/supabase.ts). */
function listItem(s: Store, o: OrderDetail): OfficeOrderListItem {
  const v = view(s, o);
  return {
    id: v.id,
    order_number: v.order_number,
    title: v.title,
    status: v.status,
    priority: v.priority,
    service_type: v.service_type,
    due_at: v.due_at,
    client_id: v.client_id,
    client: { id: v.client.id, name: v.client.name },
    assignees: v.assignees,
    overdue: v.overdue,
    late_supplements_unseen: v.late_supplements_unseen,
  };
}

function findOrder(s: Store, id: string): OrderDetail {
  return s.orders.find((o) => o.id === id || String(o.order_number) === id) ?? fail('not_found');
}

function pushHistory(
  s: Store,
  o: OrderDetail,
  actor: PersonRef,
  event_type: string,
  metadata: Record<string, unknown>,
) {
  const event: HistoryView = {
    id: crypto.randomUUID(),
    company_id: s.company.id,
    service_order_id: o.id,
    actor_id: actor.id,
    actor: ref(actor),
    event_type,
    metadata: metadata as HistoryView['metadata'],
    created_at: now(),
  };
  o.history.push(event);
  o.updated_at = event.created_at;
}

/** 03, R9: approved → invalid_status; cancelled → order_closed. */
function ensureEditable(o: OrderDetail) {
  if (o.status === 'approved') fail('invalid_status');
  if (o.status === 'cancelled') fail('order_closed');
}

// ---------------------------------------------------------------- leituras: O.S.

/** Lista de O.S. com cliente e técnicos, filtrada (03, "Filtrar"). Mais nova primeiro. */
export async function officeListOrders(query: OrderQuery = {}): Promise<OfficeOrderListItem[]> {
  const s = await store();
  return wait(
    s.orders
      .map((o) => listItem(s, o))
      .filter((o) => orderMatches(o, query, s.company.timezone))
      .sort((a, b) => b.order_number - a.order_number),
  );
}

/** O.S. aguardando aprovação com as tentativas (fila de revisão e dashboard). */
export async function officePendingOrders(): Promise<OrderDetail[]> {
  const s = await store();
  return wait(s.orders.filter((o) => o.status === 'pending_approval').map((o) => view(s, o)));
}

/** Detalhe da O.S. (por id ou número). */
export async function officeGetOrder(id: string): Promise<OrderDetail | null> {
  const s = await store();
  const o = s.orders.find((x) => x.id === id || String(x.order_number) === id);
  return wait(o ? view(s, o) : null);
}

/** get_dashboard (05). */
export async function officeDashboard(): Promise<DashboardCounts> {
  const s = await store();
  const items = s.orders.map((o) => view(s, o));
  const month = calendarDay(new Date(), s.company.timezone).slice(0, 7);
  const count = (status: string) => items.filter((o) => o.status === status).length;
  return wait({
    open: count('open'),
    unassigned: items.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status) && o.assignees.length === 0).length,
    in_progress: count('in_progress'),
    pending_approval: count('pending_approval'),
    rejected: count('rejected'),
    overdue: items.filter((o) => o.overdue).length,
    approved_this_month: items
      .flatMap((o) => o.attempts)
      .filter(
        (a) =>
          a.review_status === 'approved' &&
          a.reviewed_at &&
          calendarDay(a.reviewed_at, s.company.timezone).startsWith(month),
      ).length,
    late_supplements_unseen: items.reduce((sum, o) => sum + o.late_supplements_unseen, 0),
  });
}

/** Lista "complementos tardios" (04, R11): `is_late` sem ciência, mais recente primeiro. */
export async function officeLateSupplements(): Promise<LateSupplementItem[]> {
  const s = await store();
  const items = s.orders.flatMap((raw) => {
    const o = view(s, raw);
    return o.attempts
      .flatMap((a) => a.supplements)
      .filter((x) => x.is_late && !x.acknowledged_at)
      .map((supplement) => ({ order: o, supplement }));
  });
  return wait(items.sort((a, b) => b.supplement.received_at.localeCompare(a.supplement.received_at)));
}

// ---------------------------------------------------------------- leituras: clientes, membros, empresa

function clientListItem(s: Store, c: Store['clients'][number]): ClientListItem {
  const active = c.addresses.filter((a) => a.deleted_at === null);
  return {
    ...c,
    primary_address: active.find((a) => a.is_primary) ?? null,
    address_count: active.length,
    open_orders: s.orders.filter((o) => o.client_id === c.id && ACTIVE_ORDER_STATUSES.includes(o.status)).length,
  };
}

export async function officeListClients(filters: { includeDeleted?: boolean } = {}): Promise<ClientListItem[]> {
  const s = await store();
  return wait(
    s.clients
      .filter((c) => filters.includeDeleted || c.deleted_at === null)
      .map((c) => clientListItem(s, c))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
}

/** Id, nome e exclusão de todos os clientes (filtro da lista de O.S.). */
export async function officeClientNames(): Promise<ClientName[]> {
  const s = await store();
  return wait(
    s.clients
      .map((c) => ({ id: c.id, name: c.name, deleted_at: c.deleted_at }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
}

export async function officeGetClient(id: string): Promise<(ClientDetail & { open_orders: number }) | null> {
  const s = await store();
  const c = s.clients.find((x) => x.id === id);
  if (!c) return wait(null);
  const orders = s.orders
    .filter((o) => o.client_id === c.id)
    .map((o) => listItem(s, o))
    .sort((a, b) => b.order_number - a.order_number);
  return wait({ ...c, orders, open_orders: clientListItem(s, c).open_orders });
}

export async function officeListMembers(filters: { includeRemoved?: boolean } = {}): Promise<MemberView[]> {
  const s = await store();
  return wait(s.members.filter((m) => filters.includeRemoved || m.deleted_at === null));
}

/** Técnicos ativos (para atribuir e filtrar). */
export async function officeTechnicians(): Promise<PersonRef[]> {
  const s = await store();
  return wait(
    s.members
      .filter((m) => m.role === 'technician' && m.deleted_at === null)
      .map((m) => ({ id: m.user_id, full_name: m.profile.full_name }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR')),
  );
}

/** Pessoas que o usuário enxerga (quem divide a empresa, inclusive removidos), para mostrar nomes por id. */
export async function officePeople(): Promise<PersonRef[]> {
  const s = await store();
  const people = new Map<string, PersonRef>();
  for (const p of [...s.members.map((m) => m.profile), ...profiles.values()]) people.set(p.id, ref(p));
  return wait([...people.values()]);
}

export async function officeAudit(): Promise<AuditView[]> {
  const s = await store();
  return wait([...s.audit].sort((a, b) => b.created_at.localeCompare(a.created_at)));
}

export async function officeCompany(): Promise<Company> {
  const s = await store();
  return wait(s.company);
}

/** Usuário "logado" nos dados de exemplo, pelo papel do acesso real. */
export async function officeSessionUser(role: 'owner' | 'manager'): Promise<Profile> {
  await store();
  return wait(profiles.get(MOCK_USER_IDS[role]) ?? fail('not_found'));
}

// ---------------------------------------------------------------- ações: O.S. (03)

/** Fim do dia no fuso da empresa (03, R5). O fuso de exemplo (São Paulo) não tem horário de verão. */
const dueAt = (date: string | null) => (date ? new Date(`${date}T23:59:59.999-03:00`).toISOString() : null);

function addressOf(s: Store, clientId: string, addressId: string | null): ClientAddress | null {
  if (!addressId) return null;
  const client = s.clients.find((c) => c.id === clientId && c.deleted_at === null) ?? fail('not_found');
  return client.addresses.find((a) => a.id === addressId && a.deleted_at === null) ?? fail('not_found');
}

/** create_order. */
export async function createOrder(input: OrderInput & { id: string }, actor: PersonRef) {
  const s = await store();
  const existing = s.orders.find((o) => o.id === input.id);
  if (existing) return wait({ id: existing.id, order_number: existing.order_number });
  if (!blankToNull(input.title)) fail('invalid_input');
  const client = s.clients.find((c) => c.id === input.client_id && c.deleted_at === null) ?? fail('not_found');
  const address = addressOf(s, client.id, input.client_address_id);
  const created = now();
  const order: OrderDetail = {
    id: input.id,
    company_id: s.company.id,
    order_number: s.company.next_order_number,
    client_id: client.id,
    client_address_id: address?.id ?? null,
    address: address ? addressText(address) : null,
    title: input.title.trim(),
    service_type: input.service_type,
    priority: input.priority,
    instructions: blankToNull(input.instructions),
    due_at: dueAt(input.due_date),
    status: 'open',
    materials_notes: blankToNull(input.materials_notes),
    created_by: actor.id,
    created_at: created,
    updated_at: created,
    cancelled_at: null,
    cancelled_by: null,
    cancel_reason: null,
    client: { ...client },
    client_address: address,
    assignees: [],
    assignments: [],
    attempts: [],
    history: [],
    overdue: false,
    late_supplements_unseen: 0,
    created_by_ref: ref(actor),
  };
  s.company.next_order_number += 1;
  pushHistory(s, order, actor, 'created', {});
  applyAssignees(s, order, input.assignee_ids, actor, 'unassigned');
  s.orders.push(order);
  return wait({ id: order.id, order_number: order.order_number });
}

/**
 * update_order: substitui os campos editáveis (evento só do que mudou) e, opcionalmente, materiais (R11) e técnicos,
 * numa transação só: confere tudo antes de mudar a cópia, e qualquer recusa não grava nada.
 */
export async function updateOrder(id: string, edit: OrderEdit, actor: PersonRef): Promise<void> {
  const s = await store();
  const o = findOrder(s, id);
  ensureEditable(o);
  if (!blankToNull(edit.title)) fail('invalid_input');
  const address =
    edit.client_address_id !== o.client_address_id ? addressOf(s, o.client_id, edit.client_address_id) : null;
  const materials = edit.materials && blankToNull(edit.materials.text);
  if (edit.materials && o.materials_notes !== materials && o.materials_notes !== blankToNull(edit.materials.expected)) {
    fail('conflict', { current: o.materials_notes });
  }
  if (edit.assignee_ids?.some((userId) => !isTechnician(s, userId))) fail('invalid_input');

  const next = {
    title: edit.title.trim(),
    instructions: blankToNull(edit.instructions),
    priority: edit.priority,
    due_at: dueAt(edit.due_date),
    service_type: edit.service_type,
  };
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of Object.keys(next) as (keyof typeof next)[]) {
    const from = o[field];
    const to = next[field];
    const same =
      field === 'due_at'
        ? from && to
          ? calendarDay(from, s.company.timezone) === calendarDay(to, s.company.timezone)
          : from === to
        : from === to;
    if (!same) changes[field] = { from, to };
  }
  if (edit.client_address_id !== o.client_address_id) {
    const to = { client_address_id: address?.id ?? null, address: address ? addressText(address) : null };
    pushHistory(s, o, actor, 'address_changed', {
      from: { client_address_id: o.client_address_id, address: o.address },
      to,
    });
    o.client_address_id = to.client_address_id;
    o.address = to.address;
    o.client_address = address;
  }
  if (Object.keys(changes).length > 0) {
    Object.assign(o, Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.to])));
    pushHistory(s, o, actor, 'updated', { changes });
  }
  if (materials !== undefined && o.materials_notes !== materials) {
    pushHistory(s, o, actor, 'materials_updated', { from: o.materials_notes, to: materials });
    o.materials_notes = materials;
  }
  if (edit.assignee_ids) applyAssignees(s, o, edit.assignee_ids, actor, 'unassigned');
  return void (await wait(null));
}

const isTechnician = (s: Store, userId: string) =>
  s.members.some((m) => m.user_id === userId && m.role === 'technician' && m.deleted_at === null);

function applyAssignees(s: Store, o: OrderDetail, ids: string[], actor: PersonRef, cause: string) {
  const at = now();
  const wanted = new Set(ids);
  for (const a of o.assignments) {
    if (a.unassigned_at === null && !wanted.has(a.user_id)) {
      a.unassigned_at = at;
      a.unassigned_by = actor.id;
      pushHistory(s, o, actor, 'assignee_removed', { user_id: a.user_id, cause });
    }
  }
  for (const userId of wanted) {
    if (o.assignments.some((a) => a.user_id === userId && a.unassigned_at === null)) continue;
    const member =
      s.members.find((m) => m.user_id === userId && m.role === 'technician' && m.deleted_at === null) ??
      fail('invalid_input');
    o.assignments.push({
      id: crypto.randomUUID(),
      company_id: s.company.id,
      service_order_id: o.id,
      user_id: userId,
      user: { id: userId, full_name: member.profile.full_name },
      assigned_by: actor.id,
      assigned_at: at,
      created_at: at,
      unassigned_at: null,
      unassigned_by: null,
    });
    pushHistory(s, o, actor, 'assignee_added', { user_id: userId });
  }
}

/** set_assignees: conjunto final dos técnicos. */
export async function setAssignees(id: string, ids: string[], actor: PersonRef): Promise<void> {
  const s = await store();
  const o = findOrder(s, id);
  ensureEditable(o);
  applyAssignees(s, o, ids, actor, 'unassigned');
  return void (await wait(null));
}

/** update_materials_notes com detecção de conflito (03, R11). */
export async function updateMaterials(
  id: string,
  text: string | null,
  expected: string | null,
  actor: PersonRef,
): Promise<void> {
  const s = await store();
  const o = findOrder(s, id);
  ensureEditable(o);
  const next = blankToNull(text);
  if (o.materials_notes === next) return void (await wait(null));
  if (o.materials_notes !== blankToNull(expected)) fail('conflict', { current: o.materials_notes });
  pushHistory(s, o, actor, 'materials_updated', { from: o.materials_notes, to: next });
  o.materials_notes = next;
  return void (await wait(null));
}

/** cancel_order: motivo obrigatório; tentativa pendente vira `voided` (03, R10). */
export async function cancelOrder(id: string, reason: string, actor: PersonRef): Promise<void> {
  const s = await store();
  const o = findOrder(s, id);
  if (!reason.trim()) fail('reason_required');
  ensureEditable(o);
  const at = now();
  o.status = 'cancelled';
  o.cancelled_at = at;
  o.cancelled_by = actor.id;
  o.cancel_reason = reason.trim();
  for (const a of o.attempts) if (a.review_status === 'pending') a.review_status = 'voided';
  pushHistory(s, o, actor, 'cancelled', { reason: reason.trim() });
  return void (await wait(null));
}

// ---------------------------------------------------------------- ações: revisão (04)

/** review_execution. `simulateStale` imita a chegada de um complemento depois do carregamento da tela. */
export async function reviewExecution(
  input: {
    orderId: string;
    executionId: string;
    decision: 'approved' | 'rejected';
    comment: string | null;
    seenUntil: string | null;
    simulateStale?: boolean;
  },
  actor: PersonRef,
): Promise<void> {
  const s = await store();
  const o = findOrder(s, input.orderId);
  const pending = o.attempts.find((a) => a.review_status === 'pending') ?? fail('no_pending_execution');
  if (pending.id !== input.executionId) fail('not_latest_execution');
  const latest = seenUntil(pending.supplements);
  if (input.simulateStale || (latest && (!input.seenUntil || latest > input.seenUntil))) fail('stale_review');
  const comment = blankToNull(input.comment);
  if (input.decision === 'rejected' && !comment) fail('comment_required');
  pending.review_status = input.decision;
  pending.review_comment = comment;
  pending.reviewed_at = now();
  pending.reviewed_by = actor.id;
  pending.reviewer = ref(actor);
  o.status = input.decision;
  pushHistory(s, o, actor, input.decision, { execution_id: pending.id, ...(comment ? { comment } : {}) });
  return void (await wait(null));
}

/** acknowledge_supplements: marca os tardios não vistos até `seenUntil`. Devolve quantos. */
export async function acknowledgeSupplements(orderId: string, until: string, actor: PersonRef) {
  const s = await store();
  const o = findOrder(s, orderId);
  const at = now();
  let count = 0;
  for (const x of o.attempts.flatMap((a) => a.supplements)) {
    if (x.is_late && !x.acknowledged_at && x.received_at <= until) {
      x.acknowledged_at = at;
      x.acknowledged_by = actor.id;
      x.acknowledger = ref(actor);
      count += 1;
    }
  }
  if (count > 0) pushHistory(s, o, actor, 'supplements_acknowledged', { count });
  return wait(count);
}

// ---------------------------------------------------------------- ações: clientes (02)

function newAddress(s: Store, clientId: string, input: AddressInput, primary: boolean): ClientAddress {
  if (!input.street.trim() || !input.city.trim() || !/^[A-Za-z]{2}$/.test(input.state.trim())) fail('invalid_input');
  return {
    id: crypto.randomUUID(),
    company_id: s.company.id,
    client_id: clientId,
    label: blankToNull(input.label),
    zip_code: blankToNull(input.zip_code?.replace(/\D/g, '') ?? null),
    street: input.street.trim(),
    number: blankToNull(input.number),
    complement: blankToNull(input.complement),
    district: blankToNull(input.district),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    reference: blankToNull(input.reference),
    is_primary: primary,
    created_at: now(),
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
  };
}

function activeClient(s: Store, id: string) {
  return s.clients.find((c) => c.id === id && c.deleted_at === null) ?? fail('not_found');
}

/** create_client (também o cadastro rápido do formulário da O.S.). */
export async function createClient(input: {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  address: AddressInput | null;
}) {
  const s = await store();
  const existing = s.clients.find((c) => c.id === input.id);
  if (existing)
    return wait({ client_id: existing.id, address_id: existing.addresses.find((a) => a.is_primary)?.id ?? null });
  if (!input.name.trim()) fail('invalid_input');
  const address = input.address ? newAddress(s, input.id, input.address, true) : null;
  s.clients.push({
    id: input.id,
    company_id: s.company.id,
    name: input.name.trim(),
    phone: phoneDigitsOrNull(input.phone),
    notes: blankToNull(input.notes),
    created_at: now(),
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
    addresses: address ? [address] : [],
  });
  return wait({ client_id: input.id, address_id: address?.id ?? null });
}

/** Update direto de `clients` (nome, telefone, observações). */
export async function updateClient(
  id: string,
  input: { name: string; phone: string | null; notes: string | null },
): Promise<Client> {
  const s = await store();
  const c = activeClient(s, id);
  if (!input.name.trim()) fail('invalid_input');
  c.name = input.name.trim();
  c.phone = phoneDigitsOrNull(input.phone);
  c.notes = blankToNull(input.notes);
  return wait(c);
}

/** add_client_address: vira principal se pedido ou se não há principal ativo (02, R3). */
export async function addAddress(target: { id: string; clientId: string }, input: AddressInput, makePrimary: boolean) {
  const s = await store();
  const clientId = target.clientId;
  const c = activeClient(s, clientId);
  if (c.addresses.some((a) => a.id === target.id)) return wait(target.id);
  const hasPrimary = c.addresses.some((a) => a.is_primary && a.deleted_at === null);
  const primary = makePrimary || !hasPrimary;
  if (primary) for (const a of c.addresses) a.is_primary = false;
  const address = { ...newAddress(s, clientId, input, primary), id: target.id };
  c.addresses.push(address);
  return wait(address.id);
}

/** Update direto de `client_addresses`. */
export async function updateAddress(addressId: string, input: AddressInput) {
  const s = await store();
  const c = s.clients.find((x) => x.addresses.some((a) => a.id === addressId)) ?? fail('not_found');
  if (c.deleted_at) fail('not_found');
  const a = c.addresses.find((x) => x.id === addressId && x.deleted_at === null) ?? fail('not_found');
  const next = newAddress(s, c.id, input, a.is_primary);
  Object.assign(a, { ...next, id: a.id, created_at: a.created_at });
  return wait(a);
}

/** CEPs de exemplo do preenchimento automático (no Supabase, o ViaCEP: ./api/viacep.ts). */
const SAMPLE_ZIPS: Record<string, { street: string; district: string; city: string; state: string }> = {
  '01310100': { street: 'Avenida Paulista', district: 'Bela Vista', city: 'São Paulo', state: 'SP' },
  '04101300': { street: 'Rua Vergueiro', district: 'Vila Mariana', city: 'São Paulo', state: 'SP' },
  '04532060': { street: 'Rua Joaquim Floriano', district: 'Itaim Bibi', city: 'São Paulo', state: 'SP' },
  '09015000': { street: 'Rua Coronel Oliveira Lima', district: 'Centro', city: 'Santo André', state: 'SP' },
  '20040020': { street: 'Avenida Rio Branco', district: 'Centro', city: 'Rio de Janeiro', state: 'RJ' },
};

/** Endereço pelo CEP (8 dígitos). */
export async function lookupZip(digits: string): Promise<ZipLookup> {
  const address = SAMPLE_ZIPS[digits];
  return wait(address ? { kind: 'found', address } : { kind: 'not_found' });
}

/** set_primary_address. */
export async function setPrimaryAddress(addressId: string) {
  const s = await store();
  const c =
    s.clients.find(
      (x) => x.deleted_at === null && x.addresses.some((a) => a.id === addressId && a.deleted_at === null),
    ) ?? fail('not_found');
  for (const a of c.addresses) a.is_primary = a.id === addressId;
  return wait(addressId);
}

/** delete_client_address: não promove outro principal (02, R4). */
export async function deleteAddress(addressId: string, reason: string, actor: PersonRef) {
  const s = await store();
  if (!reason.trim()) fail('reason_required');
  const c =
    s.clients.find(
      (x) => x.deleted_at === null && x.addresses.some((a) => a.id === addressId && a.deleted_at === null),
    ) ?? fail('not_found');
  const a = c.addresses.find((x) => x.id === addressId) ?? fail('not_found');
  Object.assign(a, { deleted_at: now(), deleted_by: actor.id, delete_reason: reason.trim(), is_primary: false });
  return wait(a);
}

/** delete_client: recusa com O.S. em andamento (02, R7). */
export async function deleteClient(id: string, reason: string, actor: PersonRef): Promise<Client> {
  const s = await store();
  const c = activeClient(s, id);
  if (!reason.trim()) fail('reason_required');
  if (s.orders.some((o) => o.client_id === id && ACTIVE_ORDER_STATUSES.includes(o.status)))
    fail('client_has_open_orders');
  Object.assign(c, { deleted_at: now(), deleted_by: actor.id, delete_reason: reason.trim() });
  return wait(c);
}

// ---------------------------------------------------------------- ações: empresa, membros e perfil (01, 06)

function audit(
  s: Store,
  actor: PersonRef,
  action: string,
  entity: { type: string; id: string; name: string },
  metadata: Record<string, unknown>,
) {
  s.audit.push({
    id: crypto.randomUUID(),
    company_id: s.company.id,
    actor_id: actor.id,
    actor: ref(actor),
    action,
    entity_type: entity.type,
    entity_id: entity.id,
    target_name: entity.name,
    metadata: metadata as AuditView['metadata'],
    ip_address: null,
    created_at: now(),
  });
}

/** Update direto de `companies` (owner); o trigger grava `company_updated`. */
export async function updateCompany(
  input: Pick<Company, 'name' | 'document' | 'phone' | 'email' | 'timezone'>,
  actor: PersonRef,
) {
  const s = await store();
  if (!input.name.trim()) fail('invalid_input');
  const next = {
    ...input,
    name: input.name.trim(),
    document: blankToNull(input.document),
    phone: blankToNull(input.phone),
    email: blankToNull(input.email),
  };
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (s.company[key] !== next[key]) changes[key] = { from: s.company[key], to: next[key] };
  }
  if (Object.keys(changes).length > 0) {
    Object.assign(s.company, next);
    audit(s, actor, 'company_updated', { type: 'company', id: s.company.id, name: s.company.name }, { changes });
  }
  return wait(s.company);
}

/** Fecha as atribuições ativas de quem deixa de ser técnico (06, R4), em O.S. não encerradas. */
function closeAssignments(
  s: Store,
  userId: string,
  actor: PersonRef,
  cause: 'member_removed' | 'role_changed',
): number {
  let closed = 0;
  for (const o of s.orders) {
    if (!ACTIVE_ORDER_STATUSES.includes(o.status)) continue;
    const a = o.assignments.find((x) => x.user_id === userId && x.unassigned_at === null);
    if (!a) continue;
    a.unassigned_at = now();
    a.unassigned_by = actor.id;
    pushHistory(s, o, actor, 'assignee_removed', { user_id: userId, cause });
    closed += 1;
  }
  return closed;
}

const isLastOwner = (s: Store, m: MemberView) =>
  m.role === 'owner' && s.members.filter((x) => x.role === 'owner' && x.deleted_at === null).length === 1;

/** Edge Function invite_member: membro ativo devolve o vínculo sem mudar nada; removido é reativado. */
export async function inviteMember(input: { email: string; full_name: string; role: MemberRole }, actor: PersonRef) {
  const s = await store();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !input.full_name.trim()) fail('invalid_input');
  const existing = s.members.find((m) => memberEmails.get(m.user_id)?.toLowerCase() === email);
  if (existing && existing.deleted_at === null) return wait({ member: existing, reactivated: false, already: true });
  if (existing) {
    Object.assign(existing, { deleted_at: null, deleted_by: null, delete_reason: null, role: input.role });
    audit(
      s,
      actor,
      'member_invited',
      { type: 'company_member', id: existing.id, name: existing.profile.full_name },
      { user_id: existing.user_id, role: input.role, reactivated: true },
    );
    return wait({ member: existing, reactivated: true, already: false });
  }
  const userId = crypto.randomUUID();
  const at = now();
  const member: MemberView = {
    id: crypto.randomUUID(),
    company_id: s.company.id,
    user_id: userId,
    role: input.role,
    created_at: at,
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
    profile: {
      id: userId,
      full_name: input.full_name.trim(),
      phone: null,
      is_platform_admin: false,
      created_at: at,
      updated_at: at,
    },
  };
  s.members.push(member);
  memberEmails.set(userId, email);
  audit(
    s,
    actor,
    'member_invited',
    { type: 'company_member', id: member.id, name: member.profile.full_name },
    { user_id: userId, role: input.role, reactivated: false },
  );
  return wait({ member, reactivated: false, already: false });
}

/** Edge Function update_member_role. */
export async function updateMemberRole(memberId: string, role: MemberRole, actor: PersonRef) {
  const s = await store();
  const m = s.members.find((x) => x.id === memberId && x.deleted_at === null) ?? fail('not_found');
  if (m.role === role) return wait({ closed_assignments: 0 });
  if (isLastOwner(s, m)) fail('last_owner');
  const closed = m.role === 'technician' ? closeAssignments(s, m.user_id, actor, 'role_changed') : 0;
  audit(
    s,
    actor,
    'member_role_changed',
    { type: 'company_member', id: m.id, name: m.profile.full_name },
    { from: m.role, to: role, closed_assignments: closed },
  );
  m.role = role;
  return wait({ closed_assignments: closed });
}

/** Edge Function remove_member. */
export async function removeMember(memberId: string, reason: string, actor: PersonRef) {
  const s = await store();
  const m = s.members.find((x) => x.id === memberId && x.deleted_at === null) ?? fail('not_found');
  if (!reason.trim()) fail('reason_required');
  if (isLastOwner(s, m)) fail('last_owner');
  const closed = m.role === 'technician' ? closeAssignments(s, m.user_id, actor, 'member_removed') : 0;
  Object.assign(m, { deleted_at: now(), deleted_by: actor.id, delete_reason: reason.trim() });
  audit(
    s,
    actor,
    'member_removed',
    { type: 'company_member', id: m.id, name: m.profile.full_name },
    { reason: reason.trim(), closed_assignments: closed },
  );
  return wait({ closed_assignments: closed });
}

/** Update direto de `profiles` (o próprio usuário). */
export async function updateProfile(id: string, input: { full_name: string; phone: string | null }) {
  const s = await store();
  if (!input.full_name.trim()) fail('invalid_input');
  const current = profiles.get(id) ?? fail('not_found');
  const next = {
    ...current,
    full_name: input.full_name.trim(),
    phone: phoneDigitsOrNull(input.phone),
    updated_at: now(),
  };
  profiles.set(id, next);
  const member = s.members.find((m) => m.user_id === id);
  if (member) member.profile = next;
  return wait(next);
}
