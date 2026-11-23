// Resumo da O.S. no topo do detalhe: prazo, tipo de serviço e a dupla.
import { CalendarClock, Users } from 'lucide-react';
import { ServiceTypeBadge } from '@/components/badges';
import { DetailItem, DetailList, Section } from '@/components/section';
import { AvatarStack } from '@/components/user';
import { formatDateTime, formatDue } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type TechOrder, useTimeZone } from '../api';

export function OrderSummarySection({ order }: { order: TechOrder }) {
  const TZ = useTimeZone();
  return (
    <Section density="touch">
      <DetailList columns={2}>
        <DetailItem label={t('technician.detail.due')}>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-base font-medium',
              order.overdue && 'tone-text [--tone:var(--overdue)]',
            )}
          >
            <CalendarClock aria-hidden className="size-4" />
            {order.due_at ? formatDue(order.due_at, TZ) : t('technician.detail.noDue')}
          </span>
          {order.due_at && (
            <span className="block text-xs text-muted-foreground tabular-nums">{formatDateTime(order.due_at, TZ)}</span>
          )}
        </DetailItem>
        <DetailItem label={t('technician.detail.type')}>
          <ServiceTypeBadge type={order.service_type} size="lg" />
        </DetailItem>
        <DetailItem label={t('technician.detail.team')} full>
          <span className="inline-flex items-center gap-2">
            <Users aria-hidden className="size-4 text-muted-foreground" />
            <AvatarStack people={order.assignees} size="sm" showNames />
          </span>
        </DetailItem>
      </DetailList>
    </Section>
  );
}
