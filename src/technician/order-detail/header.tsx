// Topo do detalhe da O.S. do técnico: número, "Nova" (se ainda não aberta no aparelho), status, prioridade, atrasada.
import { Link } from '@tanstack/react-router';
import { NewBadge, OrderStatusBadge, OverdueBadge, PriorityBadge } from '@/components/badges';
import { PageHeader } from '@/components/page-header';
import { formatOrderNumber } from '@/lib/format';
import type { TechOrder } from '../api';

export function OrderDetailHeader({ order, wasNew }: { order: TechOrder; wasNew: boolean }) {
  return (
    <PageHeader
      back={<Link to="/technician" />}
      eyebrow={
        <span className="inline-flex items-center gap-2">
          {formatOrderNumber(order.order_number)}
          {wasNew && <NewBadge size="sm" />}
        </span>
      }
      title={order.title}
      meta={
        <>
          <OrderStatusBadge status={order.status} />
          {order.priority !== 'normal' && <PriorityBadge priority={order.priority} long />}
          {order.overdue && <OverdueBadge />}
        </>
      }
    />
  );
}
