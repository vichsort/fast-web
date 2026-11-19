// Colunas prontas de O.S. para a DataTable (lista do escritório, dashboard, histórico do cliente).
import { ORDER_PRIORITIES, ORDER_STATUSES } from '@/lib/enums';
import { formatDateShort, formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  LateSupplementBadge,
  OrderStatusBadge,
  OverdueBadge,
  PriorityBadge,
  ServiceTypeBadge,
  UnassignedBadge,
} from './badges';
import { DataTable, type DataTableColumn, type DataTableProps } from './data-table';
import type { OrderCardData } from './order-card';
import { AvatarStack } from './user';

export interface OrderRowData extends Omit<OrderCardData, 'address'> {
  id: string;
  assignees: { id: string; full_name: string }[];
}

export type OrderColumnId = 'number' | 'title' | 'client' | 'status' | 'priority' | 'type' | 'assignees' | 'due';

const priorityRank = (p: OrderRowData['priority']) => ORDER_PRIORITIES.indexOf(p);
const statusRank = (s: OrderRowData['status']) => ORDER_STATUSES.indexOf(s);

/** Colunas de O.S. Escolha quais e em que ordem com `include`. */
export function orderColumns<T extends OrderRowData>({
  timeZone,
  now,
  include = ['number', 'title', 'status', 'priority', 'assignees', 'due'],
}: {
  timeZone: string;
  now?: Date;
  include?: OrderColumnId[];
}): DataTableColumn<T>[] {
  const all: Record<OrderColumnId, DataTableColumn<T>> = {
    number: {
      id: 'number',
      header: t('ui.order.columns.number'),
      label: t('ui.order.columns.number'),
      className: 'w-20',
      sortValue: (o) => o.order_number,
      cell: (o) => <span className="font-semibold tabular-nums">{formatOrderNumber(o.order_number)}</span>,
    },
    title: {
      id: 'title',
      header: t('ui.order.columns.title'),
      label: t('ui.order.columns.title'),
      sortValue: (o) => o.title,
      cell: (o) => (
        <div className="flex min-w-48 flex-col gap-0.5">
          <span className={cn('font-medium leading-snug', o.status === 'cancelled' && 'text-muted-foreground')}>
            {o.title}
          </span>
          <span className="text-xs text-muted-foreground">{o.client.name}</span>
          {(o.overdue || (o.late_supplements_unseen ?? 0) > 0) && (
            <span className="mt-1 flex flex-wrap gap-1">
              {o.overdue && <OverdueBadge size="sm" />}
              {(o.late_supplements_unseen ?? 0) > 0 && <LateSupplementBadge size="sm" />}
            </span>
          )}
        </div>
      ),
    },
    client: {
      id: 'client',
      header: t('ui.order.columns.client'),
      label: t('ui.order.columns.client'),
      hideBelow: 'lg',
      sortValue: (o) => o.client.name,
      cell: (o) => <span className="text-sm">{o.client.name}</span>,
    },
    status: {
      id: 'status',
      header: t('ui.order.columns.status'),
      label: t('ui.order.columns.status'),
      sortValue: (o) => statusRank(o.status),
      cell: (o) => <OrderStatusBadge status={o.status} size="sm" />,
    },
    priority: {
      id: 'priority',
      header: t('ui.order.columns.priority'),
      label: t('ui.order.columns.priority'),
      hideBelow: 'md',
      sortValue: (o) => priorityRank(o.priority),
      cell: (o) => <PriorityBadge priority={o.priority} size="sm" />,
    },
    type: {
      id: 'type',
      header: t('ui.order.columns.serviceType'),
      label: t('ui.order.columns.serviceType'),
      hideBelow: 'lg',
      sortValue: (o) => o.service_type,
      cell: (o) => <ServiceTypeBadge type={o.service_type} size="sm" />,
    },
    assignees: {
      id: 'assignees',
      header: t('ui.order.columns.assignees'),
      hideBelow: 'md',
      cell: (o) => (
        <AvatarStack
          people={o.assignees}
          size="xs"
          showNames
          className="max-w-44"
          empty={o.status === 'approved' || o.status === 'cancelled' ? null : <UnassignedBadge size="sm" />}
        />
      ),
    },
    due: {
      id: 'due',
      header: t('ui.order.columns.due'),
      label: t('ui.order.columns.due'),
      className: 'w-28',
      sortValue: (o) => o.due_at,
      cell: (o) =>
        o.due_at ? (
          <span
            className={cn(
              'text-sm tabular-nums',
              o.overdue ? 'tone-text font-semibold [--tone:var(--overdue)]' : 'text-muted-foreground',
            )}
          >
            {formatDateShort(o.due_at, timeZone, now)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t('ui.badge.noDueDate')}</span>
        ),
    },
  };
  return include.map((id) => all[id]);
}

export interface OrderTableProps<T extends OrderRowData>
  extends Omit<DataTableProps<T>, 'columns' | 'getRowId' | 'rowLabel'> {
  timeZone: string;
  now?: Date;
  include?: OrderColumnId[];
}

/** DataTable já montada para O.S. */
export function OrderTable<T extends OrderRowData>({ timeZone, now, include, ...props }: OrderTableProps<T>) {
  return (
    <DataTable<T>
      columns={orderColumns<T>({ timeZone, now, include })}
      getRowId={(o) => o.id}
      rowLabel={(o) => t('ui.order.number', { number: formatOrderNumber(o.order_number) })}
      defaultSort={{ id: 'number', desc: true }}
      {...props}
    />
  );
}
