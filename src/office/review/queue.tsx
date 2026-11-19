// Fila da revisão (04): O.S. aguardando aprovação, mais antigas primeiro, e os complementos tardios sem ciência.
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { Camera, ChevronRight, ClipboardCheck, Eye, FilePlus } from 'lucide-react';
import { AlertBadge, CountBadge, ToneBadge } from '@/components/badges';
import { ConfirmDialog } from '@/components/dialogs';
import { SupplementBlock } from '@/components/execution-card';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingList } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvatarStack } from '@/components/user';
import { formatOrderNumber, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { LateSupplementItem, OrderDetail } from '@/mocks';
import { acknowledgeSupplements, seenUntil } from '../api';
import { useLateSupplements, useOrders } from '../queries';
import { useOffice, useOfficeAction } from '../session';
import { textLink } from '../shared';

const route = getRouteApi('/office/review');

/** Tentativa pendente da O.S. e os alertas dela e das fotos (tentativa e complementos), sem repetir. */
export function pendingSummary(o: OrderDetail) {
  const attempt = o.attempts.find((a) => a.review_status === 'pending') ?? null;
  if (!attempt) return null;
  const all = [attempt, ...attempt.supplements];
  const photos = all.flatMap((e) => e.photos);
  const alerts = [...new Set([...attempt.alerts, ...photos.flatMap((p) => p.alerts)])];
  return { attempt, photos, alerts };
}

export function ReviewQueuePage() {
  const { tab } = route.useSearch();
  const navigate = useNavigate({ from: '/office/review' });
  const pending = useOrders({ status: ['pending_approval'] });
  const late = useLateSupplements();
  const queue = [...(pending.data ?? [])].sort((a, b) =>
    (pendingSummary(a)?.attempt.received_at ?? '').localeCompare(pendingSummary(b)?.attempt.received_at ?? ''),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader size="lg" title={t('office.review.title')} description={t('office.review.description')} />
      <Tabs
        value={tab ?? 'pending'}
        onValueChange={(value) => void navigate({ search: value === 'late' ? { tab: 'late' } : {}, replace: true })}
      >
        <TabsList>
          <TabsTrigger value="pending" className="px-3">
            <ClipboardCheck />
            {t('office.review.tabPending')}
            <CountBadge count={pending.data?.length ?? 0} tone="warning" />
          </TabsTrigger>
          <TabsTrigger value="late" className="px-3">
            <FilePlus />
            {t('office.review.tabLate')}
            <CountBadge count={late.data?.length ?? 0} tone="warning" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="pt-2">
          {pending.isError ? (
            <ErrorState onRetry={() => void pending.refetch()} />
          ) : pending.isPending ? (
            <LoadingList count={3} />
          ) : queue.length === 0 ? (
            <EmptyState
              bordered
              icon={ClipboardCheck}
              title={t('office.review.pendingEmpty')}
              description={t('office.review.pendingEmptyDescription')}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {queue.map((o) => (
                <li key={o.id}>
                  <QueueCard order={o} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="late" className="pt-2">
          {late.isError ? (
            <ErrorState onRetry={() => void late.refetch()} />
          ) : late.isPending ? (
            <LoadingList count={2} />
          ) : !late.data?.length ? (
            <EmptyState
              bordered
              icon={Eye}
              title={t('office.review.lateEmpty')}
              description={t('office.review.lateEmptyDescription')}
            />
          ) : (
            <LateList items={late.data} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QueueCard({ order: o }: { order: OrderDetail }) {
  const { timeZone } = useOffice();
  const summary = pendingSummary(o);
  if (!summary) return null;
  const { attempt, photos, alerts } = summary;
  return (
    <Link
      to="/office/review/$orderId"
      params={{ orderId: o.id }}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs outline-none transition-colors hover:bg-accent/30 focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{formatOrderNumber(o.order_number)}</span>
          <span>·</span>
          <span>{t('ui.execution.attempt', { n: attempt.attempt_number })}</span>
          <span>·</span>
          <span title={attempt.received_at}>
            {t('office.review.sent', { time: formatRelative(attempt.received_at, timeZone) })}
          </span>
        </div>
        <span className="font-medium leading-snug">{o.title}</span>
        <span className="text-sm text-muted-foreground">{o.client.name}</span>
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {alerts.map((code) => (
              <AlertBadge key={code} code={code} size="sm" />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <AvatarStack people={attempt.participant_refs} size="xs" showNames className="max-w-48" />
        <span className="inline-flex items-center gap-1">
          <Camera aria-hidden className="size-4" />
          {t('office.review.photos', { count: photos.length })}
        </span>
        {attempt.supplements.length > 0 && (
          <ToneBadge
            tone="info"
            variant="outline"
            size="sm"
            icon={FilePlus}
            label={t('office.review.supplements', { count: attempt.supplements.length })}
          />
        )}
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          {t('office.review.openReview')}
          <ChevronRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** Complementos tardios agrupados por O.S., com "dar ciência" dos que estão na tela (p_seen_until). */
function LateList({ items }: { items: LateSupplementItem[] }) {
  const { timeZone, actor } = useOffice();
  const run = useOfficeAction();
  const groups = new Map<string, LateSupplementItem[]>();
  for (const item of items) groups.set(item.order.id, [...(groups.get(item.order.id) ?? []), item]);
  return (
    <ul className="flex flex-col gap-4">
      {[...groups.values()].map((group) => {
        const order = group[0]?.order;
        if (!order) return null;
        const supplements = group.map((g) => g.supplement);
        return (
          <li key={order.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <Link to="/office/orders/$orderId" params={{ orderId: order.id }} className={textLink}>
                  {t('office.review.lateCardTitle', {
                    number: formatOrderNumber(order.order_number),
                    title: order.title,
                  })}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {order.client.name} · {t(`ui.status.${order.status}`)}
                </span>
              </div>
              <ConfirmDialog
                trigger={
                  <Button size="sm">
                    <Eye />
                    {t('office.orderDetail.acknowledge')}
                  </Button>
                }
                title={t('office.review.lateAckTitle', { count: supplements.length })}
                description={t('office.review.lateAckDescription')}
                confirmLabel={t('office.orderDetail.acknowledge')}
                onConfirm={() =>
                  run(t('office.orderDetail.acknowledge'), () =>
                    acknowledgeSupplements(order.id, seenUntil(supplements) ?? new Date().toISOString(), actor),
                  )
                }
              />
            </div>
            {supplements.map((s) => (
              <SupplementBlock key={s.id} supplement={s} timeZone={timeZone} compactPhotos />
            ))}
          </li>
        );
      })}
    </ul>
  );
}
