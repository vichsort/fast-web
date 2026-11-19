// Filtros da lista de O.S. na URL, fora da tela: a rota valida a busca sem carregar o pedaço do escritório.
import {
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  type OrderPriority,
  type OrderStatus,
  SERVICE_TYPES,
  type ServiceType,
} from '@/lib/enums';

/** Filtros da lista na URL (o dashboard linka para cada contador). `tech: 'none'` = sem técnico. */
export interface OrdersSearch {
  q?: string;
  status?: OrderStatus[];
  priority?: OrderPriority;
  type?: ServiceType;
  tech?: string;
  client?: string;
  from?: string;
  to?: string;
  overdue?: true;
}

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | undefined =>
  list.includes(value as T) ? (value as T) : undefined;
const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : undefined);
const day = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);

export function parseOrdersSearch(search: Record<string, unknown>): OrdersSearch {
  const status = Array.isArray(search.status)
    ? search.status.filter((s): s is OrderStatus => ORDER_STATUSES.includes(s as OrderStatus))
    : [];
  return {
    q: text(search.q),
    status: status.length ? status : undefined,
    priority: oneOf(ORDER_PRIORITIES, search.priority),
    type: oneOf(SERVICE_TYPES, search.type),
    tech: text(search.tech),
    client: text(search.client),
    from: day(search.from),
    to: day(search.to),
    overdue: search.overdue === true || search.overdue === 'true' ? true : undefined,
  };
}
