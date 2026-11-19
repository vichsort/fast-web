import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  Ban,
  CalendarClock,
  CircleCheck,
  CircleX,
  ClipboardList,
  CloudUpload,
  FilePlus,
  Hourglass,
  MapPin,
  MessageSquareWarning,
  Play,
  UserRound,
  Users,
} from 'lucide-react';
import * as React from 'react';
import { AddressBlock, ContactActions } from '@/components/address-block';
import { NewBadge, OrderStatusBadge, OverdueBadge, PriorityBadge, ServiceTypeBadge } from '@/components/badges';
import { ExecutionCard } from '@/components/execution-card';
import { PageHeader } from '@/components/page-header';
import { DetailItem, DetailList, Section } from '@/components/section';
import { EmptyState, ErrorState, LoadingDetail } from '@/components/states';
import { reviewVar, statusVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { AvatarStack } from '@/components/user';
import { formatDateTime, formatDue, formatOrderNumber, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { act } from './act';
import {
  draftKey,
  markSeen,
  start as startOrder,
  type TechOrder,
  useDraft,
  useMyOrders,
  usePendingItems,
  useTechOrder,
  useTechSession,
  useTimeZone,
} from './api';
import { MaterialsSection } from './materials-section';
import { ActionBar, Callout, MapPreview } from './parts';

const ACTIVE_QUEUE = ['sending', 'waiting', 'queued'];

/** Detalhe da O.S. do técnico: tudo para chegar, executar e ver o resultado (docs/screens-technician.md). */
export function OrderDetailPage() {
  const { orderId } = useParams({ from: '/technician/orders/$orderId' });
  const query = useTechOrder(orderId);
  const isNew = useMyOrders().data?.find((o) => o.id === orderId)?.is_new ?? false;
  // 04: a O.S. deixa de ser "Nova" quando é aberta neste aparelho. Lê o selo antes de marcar.
  const [wasNew] = React.useState(isNew);
  React.useEffect(() => {
    markSeen(orderId);
  }, [orderId]);

  if (query.isPending) return <LoadingDetail />;
  if (query.isError) return <ErrorState offline onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  if (!query.data) {
    return (
      <EmptyState
        bordered
        icon={ClipboardList}
        title={t('technician.detail.notFoundTitle')}
        description={t('technician.detail.notFoundDescription')}
        action={
          <Button variant="outline" render={<Link to="/technician" />} nativeButton={false}>
            {t('technician.detail.backToList')}
          </Button>
        }
      />
    );
  }
  return <OrderDetail order={query.data} wasNew={wasNew} />;
}

function OrderDetail({ order, wasNew }: { order: TechOrder; wasNew: boolean }) {
  const navigate = useNavigate();
  const TZ = useTimeZone();
  const company = useTechSession().data?.company.name;
  const queue = (usePendingItems().data ?? []).filter((i) => i.order_id === order.id);
  const activeQueue = queue.filter((i) => ACTIVE_QUEUE.includes(i.state));
  const problems = queue.filter((i) => i.state === 'refused' || i.state === 'blocked');
  const queuedSubmit = activeQueue.some((i) => i.kind === 'submit');
  const draft = useDraft(draftKey.attempt(order.id));
  const lastAttempt = order.attempts.at(-1);
  const lastRejected = lastAttempt?.review_status === 'rejected' ? lastAttempt : null;
  const attemptsNewestFirst = [...order.attempts].reverse();
  const supplementTarget =
    lastAttempt && (lastAttempt.review_status === 'pending' || lastAttempt.review_status === 'approved')
      ? lastAttempt
      : null;

  const goExecution = () => navigate({ to: '/technician/orders/$orderId/execution', params: { orderId: order.id } });
  const goSupplement = (attemptId: string) =>
    navigate({
      to: '/technician/orders/$orderId/supplement',
      params: { orderId: order.id },
      search: { attempt: attemptId },
    });

  async function start() {
    if ((await act(startOrder(order).then(() => true))) === true) void goExecution();
  }

  // Ação principal pelo status (04: iniciar e enviar de open/rejected; complemento em qualquer status menos cancelled).
  let primary: React.ReactNode = null;
  if (order.status === 'cancelled') primary = null;
  else if (order.status === 'pending_approval' || order.status === 'approved') {
    if (supplementTarget)
      primary = (
        <Button className="h-12 text-base" onClick={() => void goSupplement(supplementTarget.id)}>
          <FilePlus className="size-5" />
          {t('technician.detail.supplement')}
        </Button>
      );
  } else if (queuedSubmit) {
    primary = <p className="text-center text-sm text-muted-foreground">{t('technician.detail.queuedSubmitHint')}</p>;
  } else if (order.status === 'in_progress') {
    primary = (
      <Button className="h-12 text-base" onClick={() => void goExecution()}>
        <Play className="size-5" />
        {draft ? t('technician.detail.continueDraft', { count: draft.photos.length }) : t('technician.detail.continue')}
      </Button>
    );
  } else {
    primary = (
      <Button className="h-12 text-base" onClick={() => void start()}>
        <Play className="size-5" />
        {order.status === 'rejected' ? t('technician.detail.startAgain') : t('technician.detail.start')}
      </Button>
    );
  }

  const whatsapp = t('ui.contact.whatsappMessage', {
    name: order.client.name,
    company: company ?? '',
    number: formatOrderNumber(order.order_number),
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        back={<Link to="/technician" />}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {formatOrderNumber(order.order_number)}
            {wasNew && <NewBadge size="sm" />}
          </span>
        }
        title={order.title}
        meta={
          <>
            <OrderStatusBadge status={order.status} />
            {order.priority !== 'normal' && <PriorityBadge priority={order.priority} long />}
            {order.overdue && <OverdueBadge />}
          </>
        }
      />

      {order.status === 'cancelled' && (
        <Callout toneClass={statusVar.cancelled} icon={Ban} title={t('technician.detail.cancelledTitle')}>
          <p>{t('technician.detail.cancelledBody')}</p>
          {order.cancel_reason && (
            <p className="mt-1 font-medium">{t('technician.detail.cancelReason', { reason: order.cancel_reason })}</p>
          )}
        </Callout>
      )}

      {lastRejected && order.status !== 'cancelled' && (
        <Callout
          toneClass={reviewVar.rejected}
          icon={MessageSquareWarning}
          title={
            <span className="flex flex-col">
              {t('technician.detail.rejectedTitle')}
              {lastRejected.reviewer && lastRejected.reviewed_at && (
                <span className="text-xs font-normal opacity-80">
                  {t('technician.detail.rejectedBy', {
                    name: lastRejected.reviewer.full_name,
                    time: formatRelative(lastRejected.reviewed_at, TZ),
                  })}
                </span>
              )}
            </span>
          }
        >
          <p className="text-base font-medium whitespace-pre-line">{lastRejected.review_comment}</p>
          <p className="mt-2 text-muted-foreground">{t('technician.detail.rejectedBody')}</p>
        </Callout>
      )}

      {order.status === 'pending_approval' && (
        <Callout toneClass={statusVar.pending_approval} icon={Hourglass} title={t('technician.detail.waitingTitle')}>
          {t('technician.detail.waitingBody')}
        </Callout>
      )}
      {order.status === 'approved' && (
        <Callout toneClass={statusVar.approved} icon={CircleCheck} title={t('technician.detail.approvedTitle')}>
          {t('technician.detail.approvedBody')}
        </Callout>
      )}

      {problems.length > 0 ? (
        <Callout tone="danger" icon={CircleX} title={t('technician.detail.queueProblemTitle')} action={<PendingLink />}>
          {t('technician.detail.queueProblemBody')}
        </Callout>
      ) : (
        activeQueue.length > 0 && (
          <Callout
            tone="progress"
            icon={CloudUpload}
            title={t('technician.detail.inQueueTitle', { count: activeQueue.length })}
            action={<PendingLink />}
          >
            {t('technician.detail.inQueueBody')}
          </Callout>
        )
      )}

      <Section density="touch">
        <DetailList columns={2}>
          <DetailItem label={t('technician.detail.due')}>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-base font-medium',
                order.overdue && 'tone-text [--tone:var(--overdue)]',
              )}
            >
              <CalendarClock aria-hidden className="size-4" />
              {order.due_at ? formatDue(order.due_at, TZ) : t('technician.detail.noDue')}
            </span>
            {order.due_at && (
              <span className="block text-xs text-muted-foreground tabular-nums">
                {formatDateTime(order.due_at, TZ)}
              </span>
            )}
          </DetailItem>
          <DetailItem label={t('technician.detail.type')}>
            <ServiceTypeBadge type={order.service_type} size="lg" />
          </DetailItem>
          <DetailItem label={t('technician.detail.team')} full>
            <span className="inline-flex items-center gap-2">
              <Users aria-hidden className="size-4 text-muted-foreground" />
              <AvatarStack people={order.assignees} size="sm" showNames />
            </span>
          </DetailItem>
        </DetailList>
      </Section>

      <Section title={t('technician.detail.instructions')} icon={ClipboardList} density="touch">
        {order.instructions ? (
          <p className="text-base leading-relaxed whitespace-pre-line">{order.instructions}</p>
        ) : (
          <p className="text-muted-foreground italic">{t('technician.detail.noInstructions')}</p>
        )}
      </Section>

      <Section title={t('technician.detail.address')} icon={MapPin} density="touch">
        {order.address ? (
          <>
            <MapPreview address={order.address} />
            <AddressBlock address={order.address} hideMap size="lg" />
          </>
        ) : (
          <p className="text-muted-foreground">{t('technician.detail.noAddress')}</p>
        )}
      </Section>

      <Section title={t('technician.detail.client')} icon={UserRound} density="touch">
        <p className="text-base font-semibold">{order.client.name}</p>
        {order.client.phone ? (
          <ContactActions phone={order.client.phone} message={whatsapp} showNumber size="lg" />
        ) : (
          <p className="text-muted-foreground">{t('technician.detail.noPhone')}</p>
        )}
      </Section>

      <MaterialsSection order={order} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-base font-semibold">{t('technician.detail.attempts')}</h2>
          <p className="text-sm text-muted-foreground">{t('technician.detail.attemptsHint')}</p>
        </div>
        {attemptsNewestFirst.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {t('technician.detail.noAttempts')}
          </p>
        ) : (
          attemptsNewestFirst.map((a) => (
            <ExecutionCard
              key={a.id}
              attempt={a}
              timeZone={TZ}
              compactPhotos={a.id !== lastAttempt?.id}
              actions={
                order.status !== 'cancelled' &&
                a.id === supplementTarget?.id && (
                  <Button variant="outline" className="h-10" onClick={() => void goSupplement(a.id)}>
                    <FilePlus />
                    {t('technician.detail.supplementAction')}
                  </Button>
                )
              }
            />
          ))
        )}
      </section>

      {primary && <ActionBar>{primary}</ActionBar>}
    </div>
  );
}

function PendingLink() {
  return (
    <Button variant="outline" className="h-10 bg-card" render={<Link to="/technician/pending" />} nativeButton={false}>
      {t('technician.detail.seePending')}
    </Button>
  );
}
