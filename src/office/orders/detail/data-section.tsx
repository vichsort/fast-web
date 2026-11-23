// Dados da O.S.: tipo, prioridade, prazo, criada, atualizada e instruções (03).
import { DueLabel } from '@/components/order-card';
import { DetailItem, DetailList, Section } from '@/components/section';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { useOffice } from '../../session';

export function OrderDataSection({ order: o }: { order: OrderDetail }) {
  const { timeZone } = useOffice();
  return (
    <Section title={t('office.orderDetail.sectionData')}>
      <DetailList columns={3}>
        <DetailItem label={t('office.orderDetail.serviceType')}>{t(`ui.serviceType.${o.service_type}`)}</DetailItem>
        <DetailItem label={t('office.orderDetail.priority')}>{t(`ui.priority.${o.priority}`)}</DetailItem>
        <DetailItem label={t('office.orderDetail.due')}>
          {o.due_at ? (
            <span className="inline-flex flex-wrap items-baseline gap-1.5">
              <DueLabel dueAt={o.due_at} overdue={o.overdue} timeZone={timeZone} />
              <span className="text-xs text-muted-foreground">{formatDate(o.due_at, timeZone)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{t('office.orderDetail.noDue')}</span>
          )}
        </DetailItem>
        <DetailItem label={t('office.orderDetail.created')}>{formatDateTime(o.created_at, timeZone)}</DetailItem>
        <DetailItem label={t('office.orderDetail.updated')}>{formatRelative(o.updated_at, timeZone)}</DetailItem>
        <DetailItem label={t('office.orderDetail.instructions')} full>
          {o.instructions ?? <span className="text-muted-foreground">{t('office.orderDetail.noInstructions')}</span>}
        </DetailItem>
      </DetailList>
    </Section>
  );
}
