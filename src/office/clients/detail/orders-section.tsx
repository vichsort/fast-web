// Histórico de O.S. do cliente (02): tabela compacta; a linha abre a O.S.
import { useNavigate } from '@tanstack/react-router';
import { OrderTable } from '@/components/order-table';
import { Section } from '@/components/section';
import { EmptyState } from '@/components/states';
import { t } from '@/lib/i18n';
import type { OfficeOrderListItem } from '@/lib/views';
import { useOffice } from '../../session';
import type { ClientWithOpenOrders } from './client';

export function ClientOrdersSection({ client: c }: { client: ClientWithOpenOrders }) {
  const { timeZone } = useOffice();
  const navigate = useNavigate();
  return (
    <Section title={t('office.clientDetail.sectionOrders')} className="min-w-0 self-start">
      <OrderTable<OfficeOrderListItem>
        rows={c.orders}
        timeZone={timeZone}
        include={['number', 'title', 'status', 'assignees', 'due']}
        pageSize={10}
        density="compact"
        onRowClick={(o) => void navigate({ to: '/office/orders/$orderId', params: { orderId: o.id } })}
        empty={<EmptyState size="sm" title={t('office.clientDetail.ordersEmpty')} />}
      />
    </Section>
  );
}
