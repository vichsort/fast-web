// Revisão de uma O.S. (04): a tentativa pendente com os complementos e as fotos (origem, horário, alertas); aprovar
// com comentário opcional ou rejeitar com justificativa; stale_review quando chega complemento depois do carregamento.
import { getRouteApi, Link } from '@tanstack/react-router';
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CircleX,
  FilePlus,
  History,
  RotateCw,
  TriangleExclamationPoint,
} from 'lucide-react';
import * as React from 'react';
import { AlertBadge, OrderStatusBadge, PriorityBadge, ServiceTypeBadge } from '@/components/badges';
import { ConfirmDialog, ReasonDialog } from '@/components/dialogs';
import { ExecutionCard } from '@/components/execution-card';
import { DueLabel } from '@/components/order-card';
import { PageHeader } from '@/components/page-header';
import { DetailItem, DetailList, Section } from '@/components/section';
import { LoadingDetail } from '@/components/states';
import { alertVar, statusVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { formatNumber, formatOrderNumber, shortAddress } from '@/lib/format';
import { errorMessage, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { OrderDetail } from '@/lib/views';
import type { PhotoAlert } from '@/photos/alerts';
import { reviewExecution, seenUntil } from '../api';
import { useOrder, usePendingOrders } from '../queries';
import { useOffice, useOfficeAction } from '../session';
import { NotFound, Notice, ScratchScenario } from '../shared';
import { pendingSummary } from './queue';

const route = getRouteApi('/office/review/$orderId');

type Done = { decision: 'approved' | 'rejected'; number: number; orderId: string };

export function ReviewOrderPage() {
  const { orderId } = route.useParams();
  const order = useOrder(orderId);
  const [done, setDone] = React.useState<Done | null>(null);

  if (done && (done.orderId === orderId || String(done.number) === orderId)) return <DoneState done={done} />;
  if (order.isPending) return <LoadingDetail />;
  if (!order.data) return <NotFound back={<Link to="/office/review" />} />;
  if (order.data.status !== 'pending_approval') return <NotPending order={order.data} />;
  return <ReviewView order={order.data} onDone={setDone} onReload={() => void order.refetch()} />;
}

function ReviewView({
  order: o,
  onDone,
  onReload,
}: {
  order: OrderDetail;
  onDone: (done: Done) => void;
  onReload: () => void;
}) {
  const { timeZone, actor } = useOffice();
  const run = useOfficeAction();
  const [comment, setComment] = React.useState('');
  const [stale, setStale] = React.useState(false);
  const [simulateStale, setSimulateStale] = React.useState(false);
  const summary = pendingSummary(o);
  if (!summary) return <NotPending order={o} />;
  const { attempt, photos, alerts } = summary;
  const previous = o.attempts.filter((a) => a.id !== attempt.id).reverse();
  const number = formatOrderNumber(o.order_number);
  // Maior received_at entre os complementos carregados nesta tela (04, R10: p_seen_until).
  const seen = seenUntil(attempt.supplements);

  async function decide(decision: 'approved' | 'rejected', text: string | null) {
    const result = await run(
      t(decision === 'approved' ? 'office.review.approve' : 'office.review.reject'),
      () =>
        reviewExecution(
          { orderId: o.id, executionId: attempt.id, decision, comment: text, seenUntil: seen, simulateStale },
          actor,
        ),
      { inline: ['stale_review'] },
    );
    if (result.ok) onDone({ decision, number: o.order_number, orderId: o.id });
    else if (result.code === 'stale_review') setStale(true);
  }

  function reload() {
    setStale(false);
    setSimulateStale(false);
    onReload();
  }

  const photoAlertCounts = (['gallery_without_exif', 'gallery_before_start'] as PhotoAlert[])
    .map((code) => ({ code, count: photos.filter((p) => p.alerts.includes(code)).length }))
    .filter((x) => x.count > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        size="lg"
        back={<Link to="/office/review" />}
        eyebrow={t('office.review.eyebrow', { number })}
        title={o.title}
        description={o.client.name}
        meta={
          <>
            <OrderStatusBadge status={o.status} />
            <PriorityBadge priority={o.priority} />
            <ServiceTypeBadge type={o.service_type} />
          </>
        }
        actions={
          <Button
            variant="outline"
            render={<Link to="/office/orders/$orderId" params={{ orderId: o.id }} />}
            nativeButton={false}
          >
            {t('office.review.openOrder')}
          </Button>
        }
      />

      {stale && (
        <Notice
          tone="warning"
          icon={FilePlus}
          title={t('office.review.staleTitle')}
          description={errorMessage('stale_review')}
          action={
            <Button size="sm" onClick={reload}>
              <RotateCw />
              {t('office.common.reload')}
            </Button>
          }
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <ExecutionCard attempt={attempt} timeZone={timeZone} />
          {previous.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger
                render={<Button variant="ghost" size="sm" className="group/prev -ml-2 text-muted-foreground" />}
              >
                <History />
                {t('office.review.previousAttempts', { count: previous.length })}
                <ChevronDown className="transition-transform group-data-[panel-open]/prev:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-3 pt-2">
                {previous.map((a) => (
                  <ExecutionCard key={a.id} attempt={a} timeZone={timeZone} compactPhotos className="bg-muted/30" />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Section title={t('office.review.decisionTitle')} description={t('office.review.decisionDescription')}>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: t('office.review.summaryPhotos'), value: photos.length },
                { label: t('office.review.summarySupplements'), value: attempt.supplements.length },
                { label: t('office.review.summaryAlerts'), value: alerts.length },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/60 px-2 py-2">
                  <dd className="font-heading text-xl font-semibold tabular-nums">{formatNumber(item.value)}</dd>
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{t('office.review.alertsTitle')}</span>
              {attempt.alerts.length === 0 && photoAlertCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('office.review.noAlerts')}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {attempt.alerts.map((code) => (
                    <li key={code} className={cn('tone-soft rounded-lg border px-3 py-2 text-xs', alertVar[code])}>
                      <AlertBadge code={code} size="sm" variant="text" className="mb-0.5" />
                      <p className="text-foreground/85">{t(`alerts.${code}`)}</p>
                    </li>
                  ))}
                  {photoAlertCounts.map(({ code, count }) => (
                    <li key={code} className={cn('tone-soft rounded-lg border px-3 py-2 text-xs', alertVar[code])}>
                      <AlertBadge code={code} size="sm" variant="text" className="mb-0.5" />
                      <p className="text-foreground/85">
                        {t('office.review.photoAlertCount', { count, text: t(`alerts.${code}`) })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <ConfirmDialog
                trigger={
                  <Button disabled={stale} className="w-full">
                    <CircleCheck />
                    {t('office.review.approve')}
                  </Button>
                }
                title={t('ui.dialogs.approveTitle')}
                description={t('ui.dialogs.approveDescription')}
                confirmLabel={t('ui.dialogs.approveConfirm')}
                onOpenChange={(open) => !open && setComment('')}
                onConfirm={() => decide('approved', comment)}
              >
                <Field>
                  <FieldLabel htmlFor="approve-comment">{t('office.review.approveComment')}</FieldLabel>
                  <Textarea
                    id="approve-comment"
                    rows={3}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder={t('office.review.approveCommentPlaceholder')}
                  />
                </Field>
              </ConfirmDialog>
              <ReasonDialog
                trigger={
                  <Button variant="outline" disabled={stale} className="w-full text-destructive hover:text-destructive">
                    <CircleX />
                    {t('office.review.reject')}
                  </Button>
                }
                title={t('ui.dialogs.rejectTitle')}
                description={t('ui.dialogs.rejectDescription')}
                label={t('ui.dialogs.rejectLabel')}
                placeholder={t('office.review.rejectPlaceholder')}
                confirmLabel={t('ui.dialogs.rejectConfirm')}
                requiredCode="comment_required"
                onConfirm={(reason) => decide('rejected', reason)}
              />
            </div>
            <ScratchScenario
              label={t('office.review.staleScenario')}
              hint={t('office.review.staleScenarioHint')}
              checked={simulateStale}
              onCheckedChange={setSimulateStale}
            />
          </Section>

          <Section title={t('office.review.orderInfo')} variant="muted">
            <DetailList columns={1}>
              <DetailItem label={t('office.orderDetail.due')}>
                {o.due_at ? (
                  <DueLabel dueAt={o.due_at} overdue={o.overdue} timeZone={timeZone} />
                ) : (
                  <span className="text-muted-foreground">{t('office.orderDetail.noDue')}</span>
                )}
              </DetailItem>
              <DetailItem label={t('ui.address.title')}>
                {o.address ? shortAddress(o.address) : t('ui.order.noAddress')}
              </DetailItem>
              <DetailItem label={t('office.orderDetail.instructions')}>
                {o.instructions ?? (
                  <span className="text-muted-foreground">{t('office.orderDetail.noInstructions')}</span>
                )}
              </DetailItem>
              <DetailItem label={t('office.orderDetail.sectionMaterials')}>
                {o.materials_notes ?? (
                  <span className="text-muted-foreground">{t('office.orderDetail.materialsEmpty')}</span>
                )}
              </DetailItem>
            </DetailList>
          </Section>
        </aside>
      </div>
    </div>
  );
}

/** Depois da decisão: o resultado e a próxima O.S. da fila. */
function DoneState({ done }: { done: Done }) {
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
function NotPending({ order: o }: { order: OrderDetail }) {
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
