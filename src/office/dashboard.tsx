import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Camera, ClipboardCheck, ClockExclamationPoint, FilePlus } from 'lucide-react';
import type * as React from 'react';
import { LateSupplementBadge } from '@/components/badges';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { orderColumns } from '@/components/order-table';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { DASHBOARD_STATS, type DashboardStatKey, StatCard, StatGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, LoadingList } from '@/components/states';
import { Button } from '@/components/ui/button';
import { formatNumber, formatOrderNumber, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OfficeOrderListItem, OrderDetail } from '@/lib/views';
import { useDashboard, useLateSupplements, useOrders, usePendingOrders } from './queries';
import { useOffice } from './session';

/** Link de cada contador para a lista filtrada (05). */
const statLinks: Record<DashboardStatKey, React.ReactElement> = {
  pending_approval: <Link to="/office/review" />,
  overdue: <Link to="/office/orders" search={{ overdue: true }} />,
  late_supplements_unseen: <Link to="/office/review" search={{ tab: 'late' }} />,
  unassigned: <Link to="/office/orders" search={{ tech: 'none' }} />,
  open: <Link to="/office/orders" search={{ status: ['open'] }} />,
  in_progress: <Link to="/office/orders" search={{ status: ['in_progress'] }} />,
  rejected: <Link to="/office/orders" search={{ status: ['rejected'] }} />,
  approved_this_month: <Link to="/office/orders" search={{ status: ['approved'] }} />,
};

const LIST_SIZE = 5;

/** Envio pendente mais recente da O.S. (a tentativa principal pendente). */
const pendingAttempt = (o: OrderDetail) => o.attempts.find((a) => a.review_status === 'pending') ?? null;

export function DashboardPage() {
  const { company, timeZone } = useOffice();
  const navigate = useNavigate();
  const counts = useDashboard();
  const pending = usePendingOrders();
  const overdue = useOrders({ overdue: true });
  const late = useLateSupplements();
  const c = counts.data;

  const pendingRows = [...(pending.data ?? [])].sort((a, b) =>
    (pendingAttempt(a)?.received_at ?? '').localeCompare(pendingAttempt(b)?.received_at ?? ''),
  );
  const overdueRows = [...(overdue.data ?? [])].sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''));

  const pendingColumns: DataTableColumn<OrderDetail>[] = [
    ...orderColumns<OrderDetail>({ timeZone, include: ['number', 'title', 'assignees'] }),
    {
      id: 'sent',
      header: t('office.dashboard.sentColumn'),
      align: 'end',
      className: 'w-28',
      cell: (o) => {
        const attempt = pendingAttempt(o);
        return attempt ? (
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {formatRelative(attempt.received_at, timeZone)}
          </span>
        ) : null;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        size="lg"
        title={t('office.dashboard.title')}
        description={t('office.dashboard.description', { company: company.name })}
        meta={
          c && (
            <span className="text-sm font-medium text-muted-foreground">
              {t('office.dashboard.inProgress', {
                count: formatNumber(c.open + c.in_progress + c.pending_approval + c.rejected),
              })}
            </span>
          )
        }
      />

      {counts.isError ? (
        <ErrorState layout="inline" onRetry={() => void counts.refetch()} />
      ) : (
        <StatGrid>
          {DASHBOARD_STATS.map((stat) => {
            const value = c ? c[stat.key] : null;
            return (
              <StatCard
                key={stat.key}
                label={stat.label}
                value={value}
                icon={stat.icon}
                toneClass={stat.toneClass}
                hint={stat.key === 'approved_this_month' ? t('office.dashboard.approvedHint') : stat.hint}
                highlight={stat.alertWhenPositive && (value ?? 0) > 0}
                render={statLinks[stat.key]}
              />
            );
          })}
        </StatGrid>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          icon={ClipboardCheck}
          title={t('office.dashboard.pendingTitle')}
          description={t('office.dashboard.pendingDescription')}
          actions={
            pendingRows.length > LIST_SIZE && (
              <SeeAll count={pendingRows.length} render={<Link to="/office/review" />} />
            )
          }
        >
          <DataTable<OrderDetail>
            rows={pendingRows.slice(0, LIST_SIZE)}
            columns={pendingColumns}
            getRowId={(o) => o.id}
            rowLabel={(o) => t('ui.order.number', { number: formatOrderNumber(o.order_number) })}
            loading={pending.isPending}
            pageSize={0}
            density="compact"
            onRowClick={(o) => void navigate({ to: '/office/review/$orderId', params: { orderId: o.id } })}
            empty={<EmptyState size="sm" title={t('office.dashboard.pendingEmpty')} />}
          />
        </Section>

        <Section
          icon={ClockExclamationPoint}
          title={t('office.dashboard.overdueTitle')}
          description={t('office.dashboard.overdueDescription')}
          actions={
            overdueRows.length > LIST_SIZE && (
              <SeeAll count={overdueRows.length} render={<Link to="/office/orders" search={{ overdue: true }} />} />
            )
          }
        >
          <DataTable<OfficeOrderListItem>
            rows={overdueRows.slice(0, LIST_SIZE)}
            columns={orderColumns<OfficeOrderListItem>({
              timeZone,
              include: ['number', 'title', 'status', 'assignees', 'due'],
            })}
            getRowId={(o) => o.id}
            rowLabel={(o) => t('ui.order.number', { number: formatOrderNumber(o.order_number) })}
            loading={overdue.isPending}
            pageSize={0}
            density="compact"
            onRowClick={(o) => void navigate({ to: '/office/orders/$orderId', params: { orderId: o.id } })}
            empty={<EmptyState size="sm" title={t('office.dashboard.overdueEmpty')} />}
          />
        </Section>
      </div>

      <Section
        icon={FilePlus}
        title={t('office.dashboard.lateTitle')}
        description={t('office.dashboard.lateDescription')}
        actions={
          (late.data?.length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              render={<Link to="/office/review" search={{ tab: 'late' }} />}
              nativeButton={false}
            >
              {t('office.dashboard.review')}
              <ArrowRight />
            </Button>
          )
        }
      >
        {late.isPending ? (
          <LoadingList variant="row" count={2} />
        ) : !late.data?.length ? (
          <EmptyState size="sm" bordered title={t('office.dashboard.lateEmpty')} />
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {late.data.map(({ order, supplement }) => (
              <li key={supplement.id}>
                <Link
                  to="/office/orders/$orderId"
                  params={{ orderId: order.id }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/60"
                >
                  <span className="w-14 font-semibold tabular-nums">{formatOrderNumber(order.order_number)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{order.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {t('office.dashboard.supplementFrom', {
                        name: supplement.submitter.full_name,
                        time: formatRelative(supplement.received_at, timeZone),
                      })}
                      {' · '}
                      {supplement.description ?? t('office.dashboard.noText')}
                    </span>
                  </span>
                  {supplement.photos.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Camera aria-hidden className="size-3.5" />
                      {t('office.dashboard.photos', { count: supplement.photos.length })}
                    </span>
                  )}
                  <LateSupplementBadge size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function SeeAll({ count, render }: { count: number; render: React.ReactElement }) {
  return (
    <Button variant="ghost" size="sm" render={render} nativeButton={false}>
      {t('office.common.seeAll', { count })}
      <ArrowRight />
    </Button>
  );
}
