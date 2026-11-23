// Envios da O.S. (tentativas e complementos com fotos, do mais novo); complementar a tentativa pendente ou aprovada.
import { FilePlus } from 'lucide-react';
import { AttemptsSection } from '@/components/attempts-section';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { type TechOrder, useTimeZone } from '../api';

type Attempt = TechOrder['attempts'][number];

export function OrderAttemptsSection({
  order,
  supplementTarget,
  onSupplement,
}: {
  order: TechOrder;
  supplementTarget: Attempt | null;
  onSupplement: (attemptId: string) => void;
}) {
  const TZ = useTimeZone();
  const lastAttempt = order.attempts.at(-1);
  return (
    <AttemptsSection
      title={t('technician.detail.attempts')}
      hint={t('technician.detail.attemptsHint')}
      empty={t('technician.detail.noAttempts')}
      attempts={order.attempts}
      timeZone={TZ}
      compactPhotos={(a) => a.id !== lastAttempt?.id}
      actions={(a) =>
        order.status !== 'cancelled' &&
        a.id === supplementTarget?.id && (
          <Button variant="outline" className="h-10" onClick={() => onSupplement(a.id)}>
            <FilePlus />
            {t('technician.detail.supplementAction')}
          </Button>
        )
      }
    />
  );
}
