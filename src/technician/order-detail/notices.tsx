// Avisos do detalhe da O.S. do técnico: pelo status (cancelada, última rejeição, aguardando, aprovada) e pela fila
// (envios desta O.S. na fila ou com problema).
import { Link } from '@tanstack/react-router';
import { Ban, CircleCheck, CircleX, CloudUpload, Hourglass, MessageSquareWarning } from 'lucide-react';
import { Notice } from '@/components/notice';
import { reviewVar, statusVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import { type TechOrder, useTimeZone } from '../api';

type Attempt = TechOrder['attempts'][number];

export function StatusNotices({ order, lastRejected }: { order: TechOrder; lastRejected: Attempt | null }) {
  return (
    <>
      {order.status === 'cancelled' && <CancelledNotice order={order} />}
      {lastRejected && order.status !== 'cancelled' && <RejectedNotice attempt={lastRejected} />}
      {order.status === 'pending_approval' && <WaitingNotice />}
      {order.status === 'approved' && <ApprovedNotice />}
    </>
  );
}

function CancelledNotice({ order }: { order: TechOrder }) {
  return (
    <Notice layout="stacked" toneClass={statusVar.cancelled} icon={Ban} title={t('technician.detail.cancelledTitle')}>
      <p>{t('technician.detail.cancelledBody')}</p>
      {order.cancel_reason && (
        <p className="mt-1 font-medium">{t('technician.detail.cancelReason', { reason: order.cancel_reason })}</p>
      )}
    </Notice>
  );
}

function RejectedNotice({ attempt }: { attempt: Attempt }) {
  const TZ = useTimeZone();
  return (
    <Notice
      layout="stacked"
      toneClass={reviewVar.rejected}
      icon={MessageSquareWarning}
      title={
        <span className="flex flex-col">
          {t('technician.detail.rejectedTitle')}
          {attempt.reviewer && attempt.reviewed_at && (
            <span className="text-xs font-normal opacity-80">
              {t('technician.detail.rejectedBy', {
                name: attempt.reviewer.full_name,
                time: formatRelative(attempt.reviewed_at, TZ),
              })}
            </span>
          )}
        </span>
      }
    >
      <p className="text-base font-medium whitespace-pre-line">{attempt.review_comment}</p>
      <p className="mt-2 text-muted-foreground">{t('technician.detail.rejectedBody')}</p>
    </Notice>
  );
}

function WaitingNotice() {
  return (
    <Notice
      layout="stacked"
      toneClass={statusVar.pending_approval}
      icon={Hourglass}
      title={t('technician.detail.waitingTitle')}
    >
      {t('technician.detail.waitingBody')}
    </Notice>
  );
}

function ApprovedNotice() {
  return (
    <Notice
      layout="stacked"
      toneClass={statusVar.approved}
      icon={CircleCheck}
      title={t('technician.detail.approvedTitle')}
    >
      {t('technician.detail.approvedBody')}
    </Notice>
  );
}

/** Envios desta O.S. com problema (recusados, bloqueados) ou, sem eles, ainda na fila. */
export function QueueNotice({ activeCount, problemCount }: { activeCount: number; problemCount: number }) {
  if (problemCount > 0) {
    return (
      <Notice
        layout="stacked"
        tone="danger"
        icon={CircleX}
        title={t('technician.detail.queueProblemTitle')}
        action={<PendingLink />}
      >
        {t('technician.detail.queueProblemBody')}
      </Notice>
    );
  }
  if (activeCount === 0) return null;
  return (
    <Notice
      layout="stacked"
      tone="progress"
      icon={CloudUpload}
      title={t('technician.detail.inQueueTitle', { count: activeCount })}
      action={<PendingLink />}
    >
      {t('technician.detail.inQueueBody')}
    </Notice>
  );
}

function PendingLink() {
  return (
    <Button variant="outline" className="h-10 bg-card" render={<Link to="/technician/pending" />} nativeButton={false}>
      {t('technician.detail.seePending')}
    </Button>
  );
}
