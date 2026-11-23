// Faixas do detalhe do cliente: excluído (motivo, quem, quando) e exclusão barrada por O.S. em andamento (02).
import { Link } from '@tanstack/react-router';
import { Ban, TriangleExclamationPoint } from 'lucide-react';
import { Notice } from '@/components/notice';
import { Button } from '@/components/ui/button';
import { ACTIVE_ORDER_STATUSES } from '@/lib/enums';
import { formatDateTime } from '@/lib/format';
import { errorMessage, t } from '@/lib/i18n';
import { usePersonName } from '../../queries';
import { useOffice } from '../../session';
import type { ClientWithOpenOrders } from './client';

export function DeletedClientNotice({ client: c }: { client: ClientWithOpenOrders }) {
  const personName = usePersonName();
  const { timeZone } = useOffice();
  return (
    <Notice tone="muted" icon={Ban} title={t('office.clientDetail.deletedTitle')}>
      <p>{t('office.clientDetail.deletedDescription')}</p>
      {c.delete_reason && <p>{t('office.common.reason', { reason: c.delete_reason })}</p>}
      {c.deleted_at && (
        <p className="text-xs opacity-80">
          {t('office.common.deletedBy', {
            name: personName(c.deleted_by),
            time: formatDateTime(c.deleted_at, timeZone),
          })}
        </p>
      )}
    </Notice>
  );
}

export function OpenOrdersNotice({ client: c }: { client: ClientWithOpenOrders }) {
  return (
    <Notice
      tone="danger"
      icon={TriangleExclamationPoint}
      title={errorMessage('client_has_open_orders')}
      action={
        <Button
          size="sm"
          variant="outline"
          render={<Link to="/office/orders" search={{ client: c.id, status: [...ACTIVE_ORDER_STATUSES] }} />}
          nativeButton={false}
        >
          {t('office.clientDetail.seeOpenOrders')}
        </Button>
      }
    >
      {t('office.clientDetail.hasOpenOrders')}
    </Notice>
  );
}
