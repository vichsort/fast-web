// Dados da O.S. ao lado da decisão: prazo, endereço, instruções e materiais.
import { DueLabel } from '@/components/order-card';
import { DetailItem, DetailList, Section } from '@/components/section';
import { shortAddress } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { useOffice } from '../../session';

export function OrderInfoSection({ order: o }: { order: OrderDetail }) {
  const { timeZone } = useOffice();
  return (
    <Section title={t('office.review.orderInfo')} variant="muted">
      <DetailList columns={1}>
        <DetailItem label={t('office.orderDetail.due')}>
          {o.due_at ? (
            <DueLabel dueAt={o.due_at} overdue={o.overdue} timeZone={timeZone} />
          ) : (
            <span className="text-muted-foreground">{t('office.orderDetail.noDue')}</span>
          )}
        </DetailItem>
        <DetailItem label={t('ui.address.title')}>
          {o.address ? shortAddress(o.address) : t('ui.order.noAddress')}
        </DetailItem>
        <DetailItem label={t('office.orderDetail.instructions')}>
          {o.instructions ?? <span className="text-muted-foreground">{t('office.orderDetail.noInstructions')}</span>}
        </DetailItem>
        <DetailItem label={t('office.orderDetail.sectionMaterials')}>
          {o.materials_notes ?? <span className="text-muted-foreground">{t('office.orderDetail.materialsEmpty')}</span>}
        </DetailItem>
      </DetailList>
    </Section>
  );
}
