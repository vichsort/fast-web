// Tentativas e complementos com fotos (04); a pendente leva à revisão.
import { Link } from '@tanstack/react-router';
import { AttemptsSection } from '@/components/attempts-section';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { useOffice } from '../../session';

export function ExecutionsSection({ order: o }: { order: OrderDetail }) {
  const { timeZone } = useOffice();
  return (
    <AttemptsSection
      title={t('office.orderDetail.sectionExecutions')}
      empty={t('office.orderDetail.executionsEmpty')}
      attempts={o.attempts}
      timeZone={timeZone}
      compactPhotos={() => true}
      actions={(attempt) =>
        attempt.review_status === 'pending' && o.status === 'pending_approval' ? (
          <Button
            size="sm"
            render={<Link to="/office/review/$orderId" params={{ orderId: o.id }} />}
            nativeButton={false}
          >
            {t('office.orderDetail.review')}
          </Button>
        ) : undefined
      }
    />
  );
}
