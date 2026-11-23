import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Clock, CloudUpload, HardDriveDownload, Send, Trash, TriangleAlert, WifiOff } from 'lucide-react';
import * as React from 'react';
import { AlertBadge } from '@/components/badges';
import { ConfirmDialog, SidePanel } from '@/components/dialogs';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { PhotoGrid } from '@/components/photos';
import { EmptyState, ErrorState, LoadingDetail } from '@/components/states';
import { Button } from '@/components/ui/button';
import { formatList, formatOrderNumber, formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { executionAlerts, type PhotoAlert } from '@/photos/alerts';
import { act, useOffline } from './act';
import {
  type Draft,
  discardDraft,
  draftKey,
  notify,
  start,
  submit,
  type TechOrder,
  useDraft,
  usePendingItems,
  useTechOrder,
  useTimeZone,
  withAlerts,
} from './api';
import { sendNotice } from './derive';
import { ActionBar } from './parts';
import { defaultParticipants, SubmissionForm } from './submission-form';

/** Execução: início, fotos, descrição, participantes, revisão e envio (04; docs/screens-technician.md). */
export function ExecutionPage() {
  const { orderId } = useParams({ from: '/technician/orders/$orderId/execution' });
  const query = useTechOrder(orderId);
  const pending = usePendingItems().data ?? [];
  if (query.isPending) return <LoadingDetail />;
  if (query.isError) return <ErrorState offline onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  const order = query.data;
  const queuedSubmit = pending.some(
    (i) => i.order_id === orderId && i.kind === 'submit' && ['sending', 'waiting', 'queued'].includes(i.state),
  );
  // 04, R2/R4: tentativa nova sai de open, in_progress ou rejected; nos outros status a tela leva ao complemento.
  if (!order || !['open', 'in_progress', 'rejected'].includes(order.status) || queuedSubmit) {
    return (
      <EmptyState
        bordered
        title={t('technician.execution.notAllowed')}
        description={order?.title}
        action={
          <Button
            variant="outline"
            render={order ? <Link to="/technician/orders/$orderId" params={{ orderId }} /> : <Link to="/technician" />}
            nativeButton={false}
          >
            {t('ui.actions.back')}
          </Button>
        }
      />
    );
  }
  return <Execution order={order} />;
}

function Execution({ order }: { order: TechOrder }) {
  const navigate = useNavigate();
  const TZ = useTimeZone();
  const offline = useOffline();
  const key = draftKey.attempt(order.id);
  const saved = useDraft(key);
  const draft: Draft = saved ?? {
    startedAt: order.startedHere,
    description: '',
    participants: defaultParticipants(order.participantOptions, 'attempt'),
    photos: [],
  };
  const [review, setReview] = React.useState(false);
  const [discard, setDiscard] = React.useState(false);
  const hasDraft = saved !== null;
  const canSend = draft.photos.length > 0; // 04, R3: envio novo exige ao menos 1 foto.
  const back = () => navigate({ to: '/technician/orders/$orderId', params: { orderId: order.id } });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        back={<Link to="/technician/orders/$orderId" params={{ orderId: order.id }} />}
        eyebrow={`${formatOrderNumber(order.order_number)} · ${order.client.name}`}
        title={t('technician.execution.title')}
        description={order.title}
      />

      {order.startedHere ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3.5 py-3 text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <Clock aria-hidden className="size-4 text-muted-foreground" />
            {t('technician.execution.startedAt', { time: formatTime(order.startedHere, TZ) })}
          </span>
          {hasDraft && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <HardDriveDownload aria-hidden className="size-4" />
              {t('technician.execution.draftSaved')}
            </span>
          )}
        </div>
      ) : (
        <Notice
          layout="stacked"
          tone="warning"
          icon={Clock}
          title={t('technician.execution.notStarted')}
          action={
            <Button
              variant="outline"
              className="h-10 bg-card"
              onClick={() => void act(start(order), t('technician.execution.startNow'))}
            >
              {t('technician.execution.startNow')}
            </Button>
          }
        >
          {t('technician.execution.notStartedHint')}
        </Notice>
      )}

      <SubmissionForm
        draftKey={key}
        draft={draft}
        participantOptions={order.participantOptions}
        descriptionLabel={t('technician.execution.description')}
        descriptionPlaceholder={t('technician.execution.descriptionPlaceholder')}
        photosHint={t('technician.execution.photosHint')}
      />

      {hasDraft && (
        <Button variant="ghost" className="h-11 self-center text-destructive" onClick={() => setDiscard(true)}>
          <Trash />
          {t('technician.execution.discard')}
        </Button>
      )}

      <ActionBar>
        {!canSend && (
          <p className="text-center text-sm text-muted-foreground">{t('technician.execution.photosRequired')}</p>
        )}
        <Button className="h-12 text-base" disabled={!canSend} onClick={() => setReview(true)}>
          <Send className="size-5" />
          {t('technician.execution.review')}
        </Button>
      </ActionBar>

      <ReviewPanel
        open={review}
        onOpenChange={setReview}
        order={order}
        draft={draft}
        offline={offline}
        onSend={async () => {
          const result = await act(submit(order, key, null));
          if (!result) return;
          notify(t(`technician.execution.${sendNotice(result, offline)}`));
          void back();
        }}
      />

      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        tone="destructive"
        title={t('technician.execution.discardTitle')}
        description={t('technician.execution.discardDescription')}
        confirmLabel={t('ui.actions.discard')}
        onConfirm={() => void act(discardDraft(key), t('technician.execution.discard'))}
      />
    </div>
  );
}

/** Revisão antes de enviar: o que vai, os alertas que o escritório vai ver (04, prova fotográfica) e a fila. */
function ReviewPanel({
  open,
  onOpenChange,
  order,
  draft,
  offline,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: TechOrder;
  draft: Draft;
  offline: boolean;
  onSend: () => void;
}) {
  const TZ = useTimeZone();
  const photos = withAlerts(draft.photos, draft.startedAt);
  const photoAlertCounts = new Map<PhotoAlert, number>();
  for (const alert of photos.flatMap((p) => p.alerts)) {
    photoAlertCounts.set(alert, (photoAlertCounts.get(alert) ?? 0) + 1);
  }
  const attemptAlerts = executionAlerts(
    { clientSubmittedAt: new Date().toISOString(), receivedAt: null },
    { dueAt: order.due_at },
    order.attempts.map((a) => ({ reviewStatus: a.review_status, reviewedAt: a.reviewed_at })),
  );
  const names = order.participantOptions
    .filter((p) => p.isSelf || draft.participants.includes(p.id))
    .map((p) => p.full_name);
  const hasAlerts = photoAlertCounts.size > 0 || attemptAlerts.length > 0;

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={t('technician.execution.reviewTitle')}
      description={t('technician.execution.reviewDescription')}
      footer={
        <Button
          className="h-12 w-full text-base"
          onClick={() => {
            onOpenChange(false);
            onSend();
          }}
        >
          {offline ? <CloudUpload className="size-5" /> : <Send className="size-5" />}
          {t('technician.execution.send')}
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 text-sm">
        <PhotoGrid photos={photos} timeZone={TZ} density="compact" />
        <p className={draft.description.trim() ? 'text-base whitespace-pre-line' : 'text-muted-foreground italic'}>
          {draft.description.trim() || t('technician.execution.reviewNoDescription')}
        </p>
        <p className="text-muted-foreground">
          {t('technician.execution.reviewParticipants', { names: formatList(names) })}
        </p>
        {hasAlerts && (
          <Notice layout="stacked" tone="warning" icon={TriangleAlert} title={t('technician.execution.reviewAlerts')}>
            <ul className="flex flex-col gap-1.5">
              {[...photoAlertCounts].map(([code, count]) => (
                <li key={code} className="flex flex-wrap items-center gap-2">
                  <AlertBadge code={code} size="sm" />
                  <span>
                    {t(`alerts.${code}`)} ({count})
                  </span>
                </li>
              ))}
              {attemptAlerts.map((code) => (
                <li key={code} className="flex flex-wrap items-center gap-2">
                  <AlertBadge code={code} size="sm" />
                  <span>{t(`alerts.${code}`)}</span>
                </li>
              ))}
            </ul>
          </Notice>
        )}
        {offline ? (
          <Notice layout="stacked" tone="progress" icon={WifiOff} title={t('technician.execution.reviewOfflineTitle')}>
            {t('technician.execution.reviewOfflineBody')}
          </Notice>
        ) : (
          <p className="flex items-start gap-2 text-muted-foreground">
            <CloudUpload aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('technician.execution.reviewOnlineBody')}
          </p>
        )}
      </div>
    </SidePanel>
  );
}
