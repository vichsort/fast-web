// Funções de acesso dos dados de exemplo. Assíncronas e com a forma das consultas reais (leituras diretas com
// filtros, get_dashboard), para as telas trocarem pela integração sem refazer. Ações não gravam nada.
import { ACTIVE_ORDER_STATUSES, type MemberRole } from '@/lib/enums';
import { calendarDay } from '@/lib/format';
import { executionAlerts, photoAlerts } from '@/photos/alerts';
import {
  addresses,
  assignments,
  auditLogs,
  clients,
  company,
  executions,
  history,
  members,
  NOW,
  orders,
  pendingItems,
  photos,
  photoUrls,
  profiles,
  seenOnDevice,
  sessionUsers,
  syncState,
  TIME_ZONE,
} from './data';
import type {
  AttemptView,
  AuditView,
  ClientDetail,
  ClientListItem,
  Company,
  DashboardCounts,
  Execution,
  ExecutionView,
  HistoryView,
  LateSupplementItem,
  MemberView,
  OrderDetail,
  OrderFilters,
  OrderListItem,
  PendingItem,
  PersonRef,
  PhotoView,
  Profile,
  ServiceOrder,
  SyncState,
} from './types';

/** Latência simulada (ms). 0 nos testes; a vitrine usa o padrão para mostrar os estados de carregando. */
let latency = 250;
export function setMockLatency(ms: number) {
  latency = ms;
}
const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), latency));

// ---------------------------------------------------------------- referências

const allProfiles = Object.values(profiles);
const personRef = (id: string | null): PersonRef | null => {
  if (!id) return null;
  const p = allProfiles.find((x) => x.id === id);
  return p ? { id: p.id, full_name: p.full_name } : { id, full_name: '—' };
};
const person = (id: string): PersonRef => personRef(id) ?? { id, full_name: '—' };
const allClients = Object.values(clients);
const allAddresses = Object.values(addresses);

/** 03, R6 (no real, a tela calcula o mesmo a partir de due_at e status). */
function isOverdue(o: ServiceOrder): boolean {
  return (
    o.due_at !== null &&
    Date.parse(o.due_at) < NOW &&
    (['open', 'in_progress', 'rejected'] as string[]).includes(o.status)
  );
}

function toListItem(o: ServiceOrder): OrderListItem {
  const client = allClients.find((c) => c.id === o.client_id);
  return {
    ...o,
    client: {
      id: o.client_id,
      name: client?.name ?? '—',
      phone: client?.phone ?? null,
      deleted_at: client?.deleted_at ?? null,
    },
    assignees: assignments
      .filter((a) => a.service_order_id === o.id && a.unassigned_at === null)
      .map((a) => person(a.user_id)),
    overdue: isOverdue(o),
    late_supplements_unseen: executions.filter(
      (e) => e.service_order_id === o.id && e.is_late && e.acknowledged_at === null,
    ).length,
  };
}

function photoViews(execution: Execution): PhotoView[] {
  return photos
    .filter((p) => p.execution_id === execution.id)
    .map((p) => ({
      ...p,
      url: photoUrls.get(p.id) ?? '',
      alerts: photoAlerts(
        { source: p.source, capturedAt: p.captured_at },
        { clientStartedAt: execution.client_started_at },
      ),
    }));
}

function executionView(e: Execution, order: ServiceOrder, orderAttempts: Execution[]): ExecutionView {
  const isAttempt = e.supplements_execution_id === null;
  return {
    ...e,
    submitter: person(e.submitted_by),
    participant_refs: e.participants.map(person),
    reviewer: personRef(e.reviewed_by),
    acknowledger: personRef(e.acknowledged_by),
    photos: photoViews(e),
    alerts: isAttempt
      ? executionAlerts(
          { clientSubmittedAt: e.client_submitted_at, receivedAt: e.received_at },
          { dueAt: order.due_at },
          orderAttempts
            .filter((a) => a.id !== e.id)
            .map((a) => ({ reviewStatus: a.review_status, reviewedAt: a.reviewed_at })),
        )
      : [],
  };
}

function attemptsOf(order: ServiceOrder): AttemptView[] {
  const own = executions
    .filter((e) => e.service_order_id === order.id)
    .sort((a, b) => a.received_at.localeCompare(b.received_at));
  const attempts = own.filter((e) => e.supplements_execution_id === null);
  return attempts.map((a, index) => ({
    ...executionView(a, order, attempts),
    attempt_number: index + 1,
    supplements: own.filter((s) => s.supplements_execution_id === a.id).map((s) => executionView(s, order, attempts)),
  }));
}

// ---------------------------------------------------------------- sessão e empresa

/** Usuário de exemplo por papel (no real, a sessão do Supabase e o vínculo ativo). */
export function getSessionUser(role: MemberRole): Promise<{ profile: Profile; role: MemberRole; company: Company }> {
  return delay({ profile: sessionUsers[role], role, company });
}

export function getCompany(): Promise<Company> {
  return delay(company);
}

// ---------------------------------------------------------------- O.S.

function matches(o: OrderListItem, f: OrderFilters): boolean {
  if (f.search) {
    const q = f.search.trim().toLowerCase().replace(/^#/, '');
    const hay =
      `${o.order_number} ${String(o.order_number).padStart(4, '0')} ${o.title} ${o.client.name}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
  }
  if (f.status?.length && !f.status.includes(o.status)) return false;
  if (f.priority?.length && !f.priority.includes(o.priority)) return false;
  if (f.service_type?.length && !f.service_type.includes(o.service_type)) return false;
  if (f.technician_id && !o.assignees.some((a) => a.id === f.technician_id)) return false;
  if (f.client_id && o.client_id !== f.client_id) return false;
  if (f.due_from || f.due_to) {
    if (!o.due_at) return false;
    const day = calendarDay(o.due_at, TIME_ZONE);
    if (f.due_from && day < f.due_from) return false;
    if (f.due_to && day > f.due_to) return false;
  }
  if (f.overdue && !o.overdue) return false;
  if (f.unassigned && (o.assignees.length > 0 || !ACTIVE_ORDER_STATUSES.includes(o.status))) return false;
  return true;
}

/** Lista do escritório: `service_orders` com cliente e técnicos, filtrada (03, "Filtrar"). Mais nova primeiro. */
export function listOrders(filters: OrderFilters = {}): Promise<OrderListItem[]> {
  const list = orders
    .map(toListItem)
    .filter((o) => matches(o, filters))
    .sort((a, b) => b.order_number - a.order_number);
  return delay(list);
}

/** "Minhas O.S." do técnico: atribuição ativa (03, R14), com o selo de não aberta neste aparelho. */
export function listMyOrders(userId: string): Promise<(OrderListItem & { is_new: boolean })[]> {
  const mine = orders
    .filter((o) =>
      assignments.some((a) => a.service_order_id === o.id && a.user_id === userId && a.unassigned_at === null),
    )
    .map((o) => ({ ...toListItem(o), is_new: !seenOnDevice.has(o.id) }))
    .sort((a, b) => (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999'));
  return delay(mine);
}

/** Detalhe da O.S. com cliente, endereço, atribuições, tentativas (com complementos e fotos) e histórico. */
export function getOrder(id: string): Promise<OrderDetail | null> {
  const o = orders.find((x) => x.id === id || String(x.order_number) === id);
  if (!o) return delay(null);
  const client = allClients.find((c) => c.id === o.client_id);
  if (!client) return delay(null);
  const detail: OrderDetail = {
    ...toListItem(o),
    client,
    client_address: allAddresses.find((a) => a.id === o.client_address_id) ?? null,
    assignments: assignments.filter((a) => a.service_order_id === o.id).map((a) => ({ ...a, user: person(a.user_id) })),
    attempts: attemptsOf(o),
    history: orderHistory(o.id),
    created_by_ref: person(o.created_by),
  };
  return delay(detail);
}

function orderHistory(orderId: string): HistoryView[] {
  return history.filter((h) => h.service_order_id === orderId).map((h) => ({ ...h, actor: personRef(h.actor_id) }));
}

/** Linha do tempo de uma O.S. (`service_order_history`), mais antiga primeiro. */
export function listOrderHistory(orderId: string): Promise<HistoryView[]> {
  return delay(orderHistory(orderId));
}

// ---------------------------------------------------------------- dashboard (05)

function dashboardCounts(): DashboardCounts {
  const items = orders.map(toListItem);
  const month = calendarDay(new Date(NOW), TIME_ZONE).slice(0, 7);
  const count = (status: string) => items.filter((o) => o.status === status).length;
  return {
    open: count('open'),
    unassigned: items.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status) && o.assignees.length === 0).length,
    in_progress: count('in_progress'),
    pending_approval: count('pending_approval'),
    rejected: count('rejected'),
    overdue: items.filter((o) => o.overdue).length,
    approved_this_month: executions.filter(
      (e) => e.review_status === 'approved' && e.reviewed_at && calendarDay(e.reviewed_at, TIME_ZONE).startsWith(month),
    ).length,
    late_supplements_unseen: executions.filter((e) => e.is_late && e.acknowledged_at === null).length,
  };
}

/** get_dashboard (05). */
export function getDashboard(): Promise<DashboardCounts> {
  return delay(dashboardCounts());
}

/** Lista "aguardando aprovação" do dashboard e da revisão. */
export function listPendingApproval(): Promise<OrderListItem[]> {
  return listOrders({ status: ['pending_approval'] });
}

/** Lista "atrasadas" do dashboard. */
export function listOverdue(): Promise<OrderListItem[]> {
  return listOrders({ overdue: true });
}

/** Lista "complementos tardios" (04, R11): `is_late` sem ciência. */
export function listLateSupplements(): Promise<LateSupplementItem[]> {
  const items = executions
    .filter((e) => e.is_late && e.acknowledged_at === null)
    .flatMap((e) => {
      const o = orders.find((x) => x.id === e.service_order_id);
      if (!o) return [];
      const attempts = executions.filter((x) => x.service_order_id === o.id && x.supplements_execution_id === null);
      return [{ order: toListItem(o), supplement: executionView(e, o, attempts) }];
    });
  return delay(items);
}

// ---------------------------------------------------------------- clientes (02)

function clientListItem(c: (typeof allClients)[number]): ClientListItem {
  const own = allAddresses.filter((a) => a.client_id === c.id && a.deleted_at === null);
  return {
    ...c,
    primary_address: own.find((a) => a.is_primary) ?? null,
    address_count: own.length,
    open_orders: orders.filter((o) => o.client_id === c.id && ACTIVE_ORDER_STATUSES.includes(o.status)).length,
  };
}

export function listClients(filters: { search?: string; includeDeleted?: boolean } = {}): Promise<ClientListItem[]> {
  const q = filters.search?.trim().toLowerCase() ?? '';
  const list = allClients
    .filter((c) => filters.includeDeleted || c.deleted_at === null)
    .filter((c) => !q || `${c.name} ${c.phone ?? ''}`.toLowerCase().includes(q))
    .map(clientListItem)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return delay(list);
}

export function getClient(id: string): Promise<ClientDetail | null> {
  const c = allClients.find((x) => x.id === id);
  if (!c) return delay(null);
  return delay({
    ...c,
    addresses: allAddresses.filter((a) => a.client_id === c.id),
    orders: orders
      .filter((o) => o.client_id === c.id)
      .map(toListItem)
      .sort((a, b) => b.order_number - a.order_number),
  });
}

// ---------------------------------------------------------------- membros e auditoria (05, 06)

export function listMembers(filters: { includeRemoved?: boolean } = {}): Promise<MemberView[]> {
  const list = members
    .filter((m) => filters.includeRemoved || m.deleted_at === null)
    .map((m) => ({
      ...m,
      profile: allProfiles.find((p) => p.id === m.user_id) as Profile,
    }))
    .sort((a, b) => a.profile.full_name.localeCompare(b.profile.full_name, 'pt-BR'));
  return delay(list);
}

/** Técnicos ativos (para atribuir e filtrar). */
export function listTechnicians(): Promise<PersonRef[]> {
  const list = members
    .filter((m) => m.role === 'technician' && m.deleted_at === null)
    .map((m) => person(m.user_id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));
  return delay(list);
}

export function listAudit(): Promise<AuditView[]> {
  const list = auditLogs.map((a) => {
    const member = members.find((m) => m.id === a.entity_id);
    return {
      ...a,
      actor: personRef(a.actor_id),
      target_name: a.entity_type === 'company' ? company.name : (personRef(member?.user_id ?? null)?.full_name ?? '—'),
    };
  });
  return delay(list);
}

// ---------------------------------------------------------------- aparelho do técnico

/** Itens da tela de Pendências (no real, a fila e as recusas do Dexie). */
export function listPendingItems(): Promise<PendingItem[]> {
  return delay(pendingItems);
}

/** Estado do indicador de sincronização (no real, o processador da fila e o "atualizado às"). */
export function getSyncState(): Promise<SyncState> {
  return delay(syncState);
}

// ---------------------------------------------------------------- utilidades das telas

/** Ids dos usuários de exemplo por papel (para simular a sessão sem chamar getSessionUser). */
export const MOCK_USER_IDS = {
  owner: sessionUsers.owner.id,
  manager: sessionUsers.manager.id,
  technician: sessionUsers.technician.id,
} as const;

/** Fuso da empresa de exemplo, para as funções de src/lib/format.ts. */
export const MOCK_TIME_ZONE = TIME_ZONE;

/** Pessoas por id (autor de eventos, participantes). */
export function getPerson(id: string): PersonRef | null {
  return personRef(id);
}
