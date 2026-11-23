import { Link } from '@tanstack/react-router';
import { ChevronDown, CircleX, HardDriveDownload, MessageSquareWarning, RotateCw } from 'lucide-react';
import { Notice } from '@/components/notice';
import { OrderCard } from '@/components/order-card';
import { EmptyState, ErrorState, LoadingList } from '@/components/states';
import { SyncIndicator } from '@/components/sync';
import { statusVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Spinner } from '@/components/ui/spinner';
import { firstName, formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  type MyOrder,
  notify,
  useMyOrders,
  usePendingItems,
  useStorageProtection,
  useSyncStatus,
  useTechSession,
  useTimeZone,
} from './api';
import { GroupHeading } from './parts';

/** Minhas O.S.: as atribuídas, agrupadas pelo que o técnico tem de fazer (docs/screens-technician.md). */
export function OrdersPage() {
  const TZ = useTimeZone();
  const orders = useMyOrders();
  const session = useTechSession().data;
  const sync = useSyncStatus();
  const storage = useStorageProtection();
  const pending = usePendingItems().data ?? [];
  const problems = pending.filter((i) => i.state === 'refused' || i.state === 'blocked').length;

  const list = orders.data ?? [];
  const rejected = list.filter((o) => o.status === 'rejected');
  const todo = list.filter((o) => o.status === 'open' || o.status === 'in_progress');
  const waiting = list.filter((o) => o.status === 'pending_approval');
  const closed = list.filter((o) => o.status === 'approved' || o.status === 'cancelled');
  const overdue = list.filter((o) => o.overdue).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {session && (
            <span className="text-sm text-muted-foreground">
              {t('technician.orders.greeting', { name: firstName(session.profile.full_name) })}
            </span>
          )}
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t('technician.orders.title')}</h1>
          {orders.data && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {t('technician.orders.summary', { todo: todo.length + rejected.length, overdue })}
              {sync?.last_sync_at && <> · {t('common.updatedAt', { time: formatTime(sync.last_sync_at, TZ) })}</>}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="icon-lg"
          className="size-11 shrink-0 rounded-full"
          aria-label={t('technician.orders.refresh')}
          disabled={orders.isFetching}
          onClick={() => {
            void orders.refetch();
            notify(t('technician.orders.refreshed'));
          }}
        >
          {orders.isFetching ? <Spinner /> : <RotateCw className="size-5" />}
        </Button>
      </header>

      {storage === 'denied' && (
        <Notice layout="stacked" tone="warning" icon={HardDriveDownload} title={t('technician.orders.storageDenied')}>
          {t('technician.orders.storageDeniedHint')}
        </Notice>
      )}

      {problems > 0 ? (
        <Notice
          layout="stacked"
          tone="danger"
          icon={CircleX}
          title={t('technician.orders.problemNotice', { count: problems })}
          action={
            <Button
              variant="outline"
              className="h-10 bg-card"
              render={<Link to="/technician/pending" />}
              nativeButton={false}
            >
              {t('technician.detail.seePending')}
            </Button>
          }
        >
          {t('technician.orders.problemNoticeHint')}
        </Notice>
      ) : (
        sync &&
        sync.pending > 0 && (
          <SyncIndicator status={sync} timeZone={TZ} variant="banner" render={<Link to="/technician/pending" />} />
        )
      )}

      {orders.isPending ? (
        <LoadingList count={4} />
      ) : orders.isError ? (
        <ErrorState offline onRetry={() => void orders.refetch()} retrying={orders.isFetching} />
      ) : list.length === 0 ? (
        <EmptyState
          bordered
          title={t('technician.orders.emptyTitle')}
          description={t('technician.orders.emptyDescription')}
        />
      ) : (
        <>
          {rejected.length > 0 && (
            <OrderGroup
              title={t('technician.orders.groups.rejected')}
              hint={t('technician.orders.groups.rejectedHint')}
              toneClass={statusVar.rejected}
              orders={rejected}
              hideStatus
            />
          )}
          <OrderGroup
            title={t('technician.orders.groups.todo')}
            hint={t('technician.orders.groups.todoHint')}
            toneClass={statusVar.in_progress}
            orders={todo}
          />
          {waiting.length > 0 && (
            <OrderGroup
              title={t('technician.orders.groups.waiting')}
              hint={t('technician.orders.groups.waitingHint')}
              toneClass={statusVar.pending_approval}
              orders={waiting}
              hideStatus
            />
          )}
          {closed.length > 0 && (
            <Collapsible className="flex flex-col gap-3">
              <CollapsibleTrigger className="group flex min-h-11 items-center justify-between gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <GroupHeading
                  title={t('technician.orders.groups.closed')}
                  count={closed.length}
                  hint={t('technician.orders.groups.closedHint')}
                />
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-3">
                {closed.map((o) => (
                  <MyOrderCard key={o.id} order={o} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}

function OrderGroup({
  title,
  hint,
  toneClass,
  orders,
  hideStatus,
}: {
  title: string;
  hint: string;
  toneClass: string;
  orders: MyOrder[];
  hideStatus?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <GroupHeading title={title} count={orders.length} hint={hint} toneClass={toneClass} />
      {orders.length === 0 ? (
        <EmptyState
          size="sm"
          bordered
          title={t('ui.states.emptyTitle')}
          description={t('ui.states.emptyDescription')}
        />
      ) : (
        orders.map((o) => <MyOrderCard key={o.id} order={o} hideStatus={hideStatus} />)
      )}
    </section>
  );
}

/** Cartão do kit; nas rejeitadas, o motivo aparece colado embaixo (o técnico decide sem abrir). */
function MyOrderCard({ order, hideStatus }: { order: MyOrder; hideStatus?: boolean }) {
  const TZ = useTimeZone();
  const link = <Link to="/technician/orders/$orderId" params={{ orderId: order.id }} />;
  return (
    <div className="flex flex-col">
      <OrderCard
        order={order}
        timeZone={TZ}
        isNew={order.is_new}
        hideStatus={hideStatus}
        density="touch"
        render={link}
        className={cn(order.rejection && 'rounded-b-none')}
      />
      {order.rejection && (
        <p
          className={cn(
            'tone-soft flex gap-2 rounded-b-xl border border-t-0 px-3.5 py-2.5 text-sm',
            statusVar.rejected,
          )}
        >
          <MessageSquareWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="line-clamp-3 text-foreground">
            {t('technician.orders.rejectionReason', { reason: order.rejection })}
          </span>
        </p>
      )}
    </div>
  );
}
