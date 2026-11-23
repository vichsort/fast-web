// Funções puras do escritório: montam as views das listas a partir das linhas do banco (select com relações
// embutidas) e filtram como as telas pedem. Valem para os dados reais e para os de exemplo. A O.S. completa é
// montada em src/lib/order-detail.ts, comum ao técnico.
import { ACTIVE_ORDER_STATUSES } from '@/lib/enums';
import { ApiError, classifyRpcError, type RpcError } from '@/lib/errors';
import { calendarDay } from '@/lib/format';
import { phoneDigits } from '@/lib/input';
import { isOverdue } from '@/lib/order-detail';
import type {
  Assignment,
  Client,
  ClientAddress,
  ClientListItem,
  ExecutionView,
  OfficeOrderListItem,
  OrderFilters,
  OrderQuery,
  PersonRef,
  ServiceOrder,
} from '@/lib/views';

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

const QUERY_FILTERS = ['status', 'priority', 'service_type', 'client_id', 'overdue'] as const;

/**
 * Separa os filtros da lista de O.S.: `query` é o que o banco aplica (a chave do cache e o pedido à API); `local`, o
 * que filtra a lista já trazida (`orderMatches`). Vazios saem, para filtro vazio e ausente darem a mesma chave.
 */
export function splitOrderFilters(filters: OrderFilters): { query: OrderQuery; local: OrderFilters } {
  const query: Record<string, unknown> = {};
  const local: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    ((QUERY_FILTERS as readonly string[]).includes(key) ? query : local)[key] = value;
  }
  return { query, local };
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
  return c.name.toLowerCase().includes(q) || (digits.length > 0 && phoneDigits(c.phone ?? '').includes(digits));
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
