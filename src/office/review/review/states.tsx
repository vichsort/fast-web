// Estados da revisão fora da decisão: depois de decidir (resultado e próxima O.S.) e O.S. sem tentativa pendente.
import { Link } from '@tanstack/react-router';
import { ArrowRight, CircleCheck, CircleX, TriangleExclamationPoint } from 'lucide-react';
import { OrderStatusBadge } from '@/components/badges';
import { statusVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { OrderDetail } from '@/lib/views';
import { usePendingOrders } from '../../queries';
import { pendingSummary } from '../queue';

export type Done = { decision: 'approved' | 'rejected'; number: number; orderId: string };

/** Depois da decisão: o resultado e a próxima O.S. da fila. */
export function DoneState({ done }: { done: Done }) {
  const pending = usePendingOrders();
  const next = [...(pending.data ?? [])]
    .filter((o) => o.id !== done.orderId)
    .sort((a, b) =>
      (pendingSummary(a)?.attempt.received_at ?? '').localeCompare(pendingSummary(b)?.attempt.received_at ?? ''),
    )[0];
  const approved = done.decision === 'approved';
  const number = formatOrderNumber(done.number);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-10 text-center">
      <span
        className={cn(
          'tone-soft flex size-14 items-center justify-center rounded-full border',
          statusVar[approved ? 'approved' : 'rejected'],
        )}
      >
        {approved ? <CircleCheck className="size-7" /> : <CircleX className="size-7" />}
      </span>
      <p className="font-heading text-lg font-semibold text-balance">
        {t(approved ? 'office.review.doneApproved' : 'office.review.doneRejected', { number })}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {next ? (
          <Button render={<Link to="/office/review/$orderId" params={{ orderId: next.id }} />} nativeButton={false}>
            {t('office.review.next', { number: formatOrderNumber(next.order_number) })}
            <ArrowRight />
          </Button>
        ) : (
          pending.data && <p className="w-full text-sm text-muted-foreground">{t('office.review.noNext')}</p>
        )}
        <Button variant="outline" render={<Link to="/office/review" />} nativeButton={false}>
          {t('office.review.backToQueue')}
        </Button>
        <Button
          variant="ghost"
          render={<Link to="/office/orders/$orderId" params={{ orderId: done.orderId }} />}
          nativeButton={false}
        >
          {t('office.review.openOrder')}
        </Button>
      </div>
    </div>
  );
}

/** A O.S. não tem tentativa pendente (no real, o review_execution devolveria no_pending_execution). */
export function NotPending({ order: o }: { order: OrderDetail }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 py-10 text-center">
      <TriangleExclamationPoint aria-hidden className="size-8 text-muted-foreground" />
      <p className="font-heading text-lg font-semibold">{t('office.review.notPendingTitle')}</p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {t('office.review.notPendingDescription')}
        <OrderStatusBadge status={o.status} size="sm" />
      </p>
      <div className="flex gap-2">
        <Button render={<Link to="/office/orders/$orderId" params={{ orderId: o.id }} />} nativeButton={false}>
          {t('ui.order.number', { number: formatOrderNumber(o.order_number) })}
        </Button>
        <Button variant="outline" render={<Link to="/office/review" />} nativeButton={false}>
          {t('office.review.backToQueue')}
        </Button>
      </div>
    </div>
  );
}
