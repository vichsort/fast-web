// Faixas do detalhe da O.S.: cancelada, aprovada, aguardando aprovação e complementos tardios sem ciência (03, 04).
import { Link } from '@tanstack/react-router';
import { Ban, CircleCheck, FilePlus, Hourglass } from 'lucide-react';
import { ConfirmDialog } from '@/components/dialogs';
import { Notice } from '@/components/notice';
import { flagVar, statusVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { acknowledgeSupplements, seenUntil } from '../../api';
import { usePersonName } from '../../queries';
import { useOffice, useOfficeAction } from '../../session';

export function OrderNotices({ order: o }: { order: OrderDetail }) {
  return (
    <>
      {o.status === 'cancelled' && <CancelledNotice order={o} />}
      {o.status === 'approved' && <ApprovedNotice order={o} />}
      <PendingReviewNotice order={o} />
      <LateSupplementsNotice order={o} />
    </>
  );
}

function CancelledNotice({ order: o }: { order: OrderDetail }) {
  const personName = usePersonName();
  const { timeZone } = useOffice();
  return (
    <Notice toneClass={statusVar.cancelled} icon={Ban} title={t('office.orderDetail.cancelledTitle')}>
      {o.cancel_reason && <p className="whitespace-pre-line">{o.cancel_reason}</p>}
      {o.cancelled_at && (
        <p className="text-xs opacity-80">
          {t('office.orderDetail.cancelledBy', {
            name: personName(o.cancelled_by),
            time: formatDateTime(o.cancelled_at, timeZone),
          })}
        </p>
      )}
    </Notice>
  );
}

function ApprovedNotice({ order: o }: { order: OrderDetail }) {
  const { timeZone } = useOffice();
  const approvedAttempt = [...o.attempts].reverse().find((a) => a.review_status === 'approved');
  return (
    <Notice toneClass={statusVar.approved} icon={CircleCheck} title={t('office.orderDetail.approvedTitle')}>
      {approvedAttempt?.reviewer && approvedAttempt.reviewed_at && (
        <span>
          {t('ui.execution.reviewedBy', {
            name: approvedAttempt.reviewer.full_name,
            time: formatDateTime(approvedAttempt.reviewed_at, timeZone),
          })}
          {'. '}
        </span>
      )}
      {t('office.orderDetail.approvedDescription')}
    </Notice>
  );
}

function PendingReviewNotice({ order: o }: { order: OrderDetail }) {
  const { timeZone } = useOffice();
  const pending = o.attempts.find((a) => a.review_status === 'pending');
  if (!pending || o.status !== 'pending_approval') return null;
  return (
    <Notice
      toneClass={statusVar.pending_approval}
      icon={Hourglass}
      title={t('office.orderDetail.pendingTitle')}
      action={
        <Button
          size="sm"
          render={<Link to="/office/review/$orderId" params={{ orderId: o.id }} />}
          nativeButton={false}
        >
          {t('office.orderDetail.review')}
        </Button>
      }
    >
      {t('office.orderDetail.pendingDescription', {
        time: formatRelative(pending.received_at, timeZone),
      })}
    </Notice>
  );
}

function LateSupplementsNotice({ order: o }: { order: OrderDetail }) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  const lateUnseen = o.attempts.flatMap((a) => a.supplements).filter((s) => s.is_late && !s.acknowledged_at);
  if (lateUnseen.length === 0) return null;
  return (
    <Notice
      toneClass={flagVar.lateSupplement}
      icon={FilePlus}
      title={t('office.orderDetail.lateTitle', { count: lateUnseen.length })}
      action={
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline">
              {t('office.orderDetail.acknowledge')}
            </Button>
          }
          title={t('office.review.lateAckTitle', { count: lateUnseen.length })}
          description={t('office.review.lateAckDescription')}
          confirmLabel={t('office.orderDetail.acknowledge')}
          onConfirm={() =>
            run(t('office.orderDetail.acknowledge'), () =>
              acknowledgeSupplements(o.id, seenUntil(lateUnseen) ?? new Date().toISOString(), actor),
            )
          }
        />
      }
    >
      {t('office.orderDetail.lateDescription')}
    </Notice>
  );
}
