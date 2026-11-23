// Histórico completo da O.S., do mais novo, agrupado por dia (03, 04).
import { Section } from '@/components/section';
import { orderHistoryEntries, Timeline } from '@/components/timeline';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { usePersonName } from '../../queries';
import { useOffice } from '../../session';

export function HistorySection({ order: o }: { order: OrderDetail }) {
  const personName = usePersonName();
  const { timeZone } = useOffice();
  return (
    <Section title={t('office.orderDetail.sectionHistory')}>
      <Timeline
        entries={orderHistoryEntries(o.history, {
          timeZone,
          personName: (id) => personName(id),
        })}
        timeZone={timeZone}
        reverse
        groupByDay
        density="compact"
      />
    </Section>
  );
}
