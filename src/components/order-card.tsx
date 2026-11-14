// Cartão de O.S. para listas no celular ("Minhas O.S.", dashboard estreito, histórico do cliente).
import { useRender } from '@base-ui/react/use-render';
import { CalendarClock, MapPin } from 'lucide-react';
import type * as React from 'react';
import type { OrderPriority, OrderStatus, ServiceType } from '@/lib/enums';
import { formatDue, formatOrderNumber, shortAddress } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  LateSupplementBadge,
  NewBadge,
  OrderStatusBadge,
  OverdueBadge,
  PriorityBadge,
  UnassignedBadge,
} from './badges';
import { statusVar } from './tone';
import { AvatarStack } from './user';

/** O que o cartão lê de uma O.S. (OrderListItem dos mocks satisfaz). */
export interface OrderCardData {
  order_number: number;
  title: string;
  status: OrderStatus;
  priority: OrderPriority;
  service_type: ServiceType;
  due_at: string | null;
  address: string | null;
  client: { name: string };
  assignees?: { id: string; full_name: string }[];
  overdue: boolean;
  late_supplements_unseen?: number;
}

export interface OrderCardProps extends Omit<React.ComponentProps<'article'>, 'onClick'> {
  order: OrderCardData;
  timeZone: string;
  now?: Date;
  /** Não aberta neste aparelho (selo "Nova"). */
  isNew?: boolean;
  /** Mostra os técnicos (escritório) ou "sem técnico". */
  showAssignees?: boolean;
  /** Esconde o selo de status (lista já filtrada por status). */
  hideStatus?: boolean;
  density?: 'compact' | 'comfortable' | 'touch';
  /** Elemento de navegação (ex.: `<Link to="/technician/orders/$id" params={...} />`): o cartão inteiro vira o link. */
  render?: React.ReactElement;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
}

/** Cartão de O.S.: número, título, cliente, endereço curto, prazo, status, prioridade e alertas. */
export function OrderCard({
  order,
  timeZone,
  now,
  isNew,
  showAssignees,
  hideStatus,
  density = 'comfortable',
  render,
  href,
  onClick,
  selected,
  className,
  ...props
}: OrderCardProps) {
  const interactive = Boolean(render || href || onClick);
  const titleLink = useRender({
    defaultTagName: 'span',
    // biome-ignore lint/a11y/useAnchorContent: o título entra como filho pelo useRender
    render: render ?? (href ? <a href={href} /> : onClick ? <button type="button" onClick={onClick} /> : undefined),
    props: {
      className: cn(
        'text-left outline-none',
        interactive &&
          'after:absolute after:inset-0 after:rounded-xl after:content-[""] focus-visible:after:ring-3 focus-visible:after:ring-ring/50',
      ),
      children: order.title,
    },
  });
  const address = shortAddress(order.address);

  return (
    <article
      data-slot="order-card"
      data-density={density}
      data-selected={selected || undefined}
      className={cn(
        'group/order-card relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card p-(--space-card) pl-[calc(var(--space-card)+0.25rem)] text-card-foreground shadow-xs transition-colors',
        'before:tone-fill before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[""]',
        statusVar[order.status],
        interactive && 'hover:bg-accent/40 active:bg-accent/60',
        selected && 'border-ring ring-2 ring-ring/30',
        order.status === 'cancelled' && 'opacity-75',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{formatOrderNumber(order.order_number)}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{t(`ui.serviceType.${order.service_type}`)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isNew && <NewBadge size="sm" />}
          {!hideStatus && <OrderStatusBadge status={order.status} size="sm" />}
        </div>
      </div>

      <h3 className="font-heading text-base leading-snug font-semibold text-balance line-clamp-2">{titleLink}</h3>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span className="truncate font-medium text-foreground/85">{order.client.name}</span>
        {address && density !== 'compact' && (
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{address}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {order.priority !== 'normal' && <PriorityBadge priority={order.priority} size="sm" />}
          {order.overdue && <OverdueBadge size="sm" />}
          {(order.late_supplements_unseen ?? 0) > 0 && (
            <LateSupplementBadge size="sm" count={order.late_supplements_unseen} />
          )}
          {showAssignees && (
            <AvatarStack people={order.assignees ?? []} size="xs" empty={<UnassignedBadge size="sm" />} />
          )}
        </div>
        <DueLabel dueAt={order.due_at} timeZone={timeZone} now={now} overdue={order.overdue} />
      </div>
    </article>
  );
}

/** Prazo curto com ícone ("amanhã", "13 nov."); vermelho se atrasada, some sem prazo. */
export function DueLabel({
  dueAt,
  timeZone,
  now,
  overdue,
  className,
}: {
  dueAt: string | null;
  timeZone: string;
  now?: Date;
  overdue?: boolean;
  className?: string;
}) {
  if (!dueAt) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs tabular-nums',
        overdue ? 'tone-text font-semibold [--tone:var(--overdue)]' : 'text-muted-foreground',
        className,
      )}
    >
      <CalendarClock aria-hidden className="size-3.5" />
      {t('ui.order.due', { date: formatDue(dueAt, timeZone, now) })}
    </span>
  );
}
