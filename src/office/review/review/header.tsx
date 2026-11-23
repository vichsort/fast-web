// Topo da revisão: número, título, cliente, selos e "Abrir O.S.".
import { Link } from '@tanstack/react-router';
import { OrderStatusBadge, PriorityBadge, ServiceTypeBadge } from '@/components/badges';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';

export function ReviewHeader({ order: o }: { order: OrderDetail }) {
  return (
    <PageHeader
      size="lg"
      back={<Link to="/office/review" />}
      eyebrow={t('office.review.eyebrow', { number: formatOrderNumber(o.order_number) })}
      title={o.title}
      description={o.client.name}
      meta={
        <>
          <OrderStatusBadge status={o.status} />
          <PriorityBadge priority={o.priority} />
          <ServiceTypeBadge type={o.service_type} />
        </>
      }
      actions={
        <Button
          variant="outline"
          render={<Link to="/office/orders/$orderId" params={{ orderId: o.id }} />}
          nativeButton={false}
        >
          {t('office.review.openOrder')}
        </Button>
      }
    />
  );
}
