// Funções puras do escritório: montam as views das telas a partir das linhas do banco (select com relações
// embutidas) e traduzem a falha de uma ação no código do texto. Valem para os dados reais e para os de exemplo.
import { ACTIVE_ORDER_STATUSES } from '@/lib/enums';
import { ApiError, classifyRpcError, type RpcError } from '@/lib/errors';
import { calendarDay } from '@/lib/format';
import type {
  Assignment,
  AttemptView,
  Client,
  ClientAddress,
  ClientListItem,
  Execution,
  ExecutionView,
  HistoryEvent,
  OfficeOrderListItem,
  OrderDetail,
  OrderFilters,
  PersonRef,
  Photo,
  ServiceOrder,
} from '@/lib/views';
import { executionAlerts, photoAlerts } from '@/photos/alerts';

export interface ExecutionRow extends Execution {
  submitter: PersonRef;
  reviewer: PersonRef | null;
  acknowledger: PersonRef | null;
  photos: Photo[];
}

/** Linha de `service_orders` com o que as telas do escritório embutem (ORDER_SELECT em api/supabase.ts). */
export interface OrderRow extends ServiceOrder {
  client: Client;
  client_address: ClientAddress | null;
  created_by_ref: PersonRef;
  assignments: (Assignment & { user: PersonRef })[];
  executions: ExecutionRow[];
  /** Só no detalhe. */
  history?: (HistoryEvent & { actor: PersonRef | null })[];
}

/**
 * Linha de `service_orders` da lista do escritório (ORDER_LIST_SELECT em api/supabase.ts): só as colunas da tabela,
 * sem execuções nem fotos; `late` são só os complementos tardios sem ciência, filtrados no banco.
 */
export interface OrderListRow extends Omit<OfficeOrderListItem, 'assignees' | 'overdue' | 'late_supplements_unseen'> {
  assignments: (Pick<Assignment, 'unassigned_at'> & { user: PersonRef })[];
  late: { id: string }[];
}

/** Linha de `clients` com os endereços e o status das O.S. (CLIENT_SELECT em api/supabase.ts). */
export interface ClientRow extends Client {
  addresses: ClientAddress[];
  orders: Pick<ServiceOrder, 'status'>[];
}

const OVERDUE_STATUSES: readonly string[] = ['open', 'in_progress', 'rejected'];

/** 03, R6: prazo vencido em open, in_progress ou rejected. */
export function isOverdue(o: Pick<ServiceOrder, 'due_at' | 'status'>, now: number): boolean {
  return o.due_at !== null && Date.parse(o.due_at) < now && OVERDUE_STATUSES.includes(o.status);
}

const byReceived = (a: { received_at: string }, b: { received_at: string }) =>
  Date.parse(a.received_at) - Date.parse(b.received_at);

/** O.S. montada como as telas leem. `photoUrls`: URLs assinadas por foto (get_photo_urls); sem ela, `url` vazia. */
export function toOrderDetail(row: OrderRow, now: number, photoUrls: Map<string, string> = new Map()): OrderDetail {
  const { executions, history, ...order } = row;
  const people = new Map(row.assignments.map((a) => [a.user.id, a.user]));
  const person = (id: string): PersonRef => people.get(id) ?? { id, full_name: '—' };

  const own = [...executions].sort(byReceived);
  const attempts = own.filter((e) => e.supplements_execution_id === null);
  const view = (e: ExecutionRow, isAttempt: boolean): ExecutionView => ({
    ...e,
    participant_refs: e.participants.map(person),
    photos: [...e.photos]
      .sort((a, b) => Date.parse(a.uploaded_at) - Date.parse(b.uploaded_at))
      .map((p) => ({
        ...p,
        url: photoUrls.get(p.id) ?? '',
        alerts: photoAlerts({ source: p.source, capturedAt: p.captured_at }, { clientStartedAt: e.client_started_at }),
      })),
    alerts: isAttempt
      ? executionAlerts(
          { clientSubmittedAt: e.client_submitted_at, receivedAt: e.received_at },
          { dueAt: row.due_at },
          attempts
            .filter((a) => a.id !== e.id)
            .map((a) => ({ reviewStatus: a.review_status, reviewedAt: a.reviewed_at })),
        )
      : [],
  });
  const attemptViews: AttemptView[] = attempts.map((a, index) => ({
    ...view(a, true),
    attempt_number: index + 1,
    supplements: own.filter((s) => s.supplements_execution_id === a.id).map((s) => view(s, false)),
  }));

  return {
    ...order,
    assignees: row.assignments.filter((a) => a.unassigned_at === null).map((a) => a.user),
    overdue: isOverdue(row, now),
    late_supplements_unseen: own.filter((e) => e.is_late && e.acknowledged_at === null).length,
    attempts: attemptViews,
    history: [...(history ?? [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
  };
}

/** Linha da lista de O.S. como a tabela lê. */
export function toOrderListItem(row: OrderListRow, now: number): OfficeOrderListItem {
  const { assignments, late, ...order } = row;
  return {
    ...order,
    assignees: assignments.filter((a) => a.unassigned_at === null).map((a) => a.user),
    overdue: isOverdue(row, now),
    late_supplements_unseen: late.length,
  };
}

/** Filtros da lista de O.S. (03, "Filtrar") sobre a view já montada. */
export function orderMatches(o: OfficeOrderListItem, f: OrderFilters, timeZone: string): boolean {
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
    const day = calendarDay(o.due_at, timeZone);
    if (f.due_from && day < f.due_from) return false;
    if (f.due_to && day > f.due_to) return false;
  }
  if (f.overdue && !o.overdue) return false;
  if (f.unassigned && (o.assignees.length > 0 || !ACTIVE_ORDER_STATUSES.includes(o.status))) return false;
  return true;
}

/** Cliente como a lista mostra: principal ativo, endereços ativos e O.S. em andamento (02, R7). */
export function toClientListItem(row: ClientRow): ClientListItem {
  const { addresses, orders, ...client } = row;
  const active = addresses.filter((a) => a.deleted_at === null);
  return {
    ...client,
    primary_address: active.find((a) => a.is_primary) ?? null,
    address_count: active.length,
    open_orders: orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length,
  };
}

/** Busca de clientes: parte do nome (sem caixa) ou dígitos do telefone. */
export function clientMatches(c: Pick<Client, 'name' | 'phone'>, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  return c.name.toLowerCase().includes(q) || (digits.length > 0 && (c.phone ?? '').replace(/\D/g, '').includes(digits));
}

/** Falha de um update direto: CHECK, UNIQUE e NOT NULL são dado fora da regra (errors.md, `invalid_input`). */
export function directWriteError(error: RpcError, status: number): ApiError {
  if (['23514', '23505', '23502'].includes(error.code ?? '')) {
    return new ApiError('rule', 'invalid_input', error.message);
  }
  return classifyRpcError(error, status);
}

/** Texto do endereço copiado na O.S. (03, R3). */
export function addressText(
  a: Pick<ClientAddress, 'street' | 'number' | 'complement' | 'district' | 'city' | 'state' | 'zip_code' | 'reference'>,
): string {
  const clean = (v: string | null) => (v && v.trim() !== '' ? v.trim() : null);
  const zip = clean(a.zip_code);
  const parts = [
    [clean(a.street), clean(a.number), clean(a.complement)].filter(Boolean).join(', '),
    clean(a.district),
    `${a.city}/${a.state.toUpperCase()}`,
    zip ? `CEP ${zip.slice(0, 5)}-${zip.slice(5)}` : null,
  ].filter(Boolean);
  const reference = clean(a.reference);
  return parts.join(' - ') + (reference ? ` (${reference})` : '');
}

/** Maior `received_at` entre os complementos da tentativa (o `p_seen_until` da revisão). */
export function seenUntil(supplements: Pick<ExecutionView, 'received_at'>[]): string | null {
  return supplements.reduce<string | null>(
    (max, x) => (max === null || x.received_at > max ? x.received_at : max),
    null,
  );
}

/**
 * Código do texto de uma ação que falhou: a recusa por regra traz o do catálogo; sem conexão é `offline`; sessão
 * vencida é `not_authenticated`; o resto (servidor, bug) é o genérico.
 */
export function actionErrorCode(error: unknown): string {
  if (!(error instanceof ApiError)) return 'unknown';
  if (error.errorClass === 'rule') return error.code ?? 'unknown';
  if (error.errorClass === 'network') return 'offline';
  if (error.errorClass === 'session') return 'not_authenticated';
  return 'unknown';
}
