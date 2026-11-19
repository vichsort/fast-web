import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { FilePlus, Send, TriangleAlert } from 'lucide-react';
import { ReviewStatusBadge } from '@/components/badges';
import type { AttemptData } from '@/components/execution-card';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, LoadingDetail } from '@/components/states';
import { Button } from '@/components/ui/button';
import { formatOrderNumber, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import { act } from './act';
import { type Draft, draftKey, notify, submit, type TechOrder, useDraft, useTechOrder, useTimeZone } from './api';
import { ActionBar, Callout } from './parts';
import { defaultParticipants, SubmissionForm } from './submission-form';

/** Complemento: texto e/ou fotos que somam a uma tentativa (04, R3 e R5; docs/screens-technician.md). */
export function SupplementPage() {
  const { orderId } = useParams({ from: '/technician/orders/$orderId/supplement' });
  const { attempt: attemptId } = useSearch({ from: '/technician/orders/$orderId/supplement' });
  const query = useTechOrder(orderId);
  if (query.isPending) return <LoadingDetail />;
  if (query.isError) return <ErrorState offline onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  const order = query.data;
  const target = order?.attempts.find((a) => a.id === attemptId) ?? order?.attempts.at(-1);
  // 04, R5: complemento em qualquer status, exceto cancelled; precisa de uma tentativa principal.
  if (!order || !target || order.status === 'cancelled') {
    return (
      <EmptyState
        bordered
        icon={FilePlus}
        title={t('technician.supplement.noTarget')}
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
  return <Supplement order={order} target={target} />;
}

function Supplement({ order, target }: { order: TechOrder; target: AttemptData }) {
  const navigate = useNavigate();
  const TZ = useTimeZone();
  const key = draftKey.supplement(order.id, target.id);
  const draft: Draft = useDraft(key) ?? {
    startedAt: null,
    description: '',
    participants: defaultParticipants(order.participantOptions, 'supplement'),
    photos: [],
  };
  // 04, R3: complemento exige texto ou foto.
  const canSend = draft.description.trim().length > 0 || draft.photos.length > 0;
  // 04, R11: chega depois da revisão = tardio.
  const reviewed = target.review_status === 'approved' || target.review_status === 'rejected';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        back={<Link to="/technician/orders/$orderId" params={{ orderId: order.id }} />}
        eyebrow={`${formatOrderNumber(order.order_number)} · ${order.client.name}`}
        title={t('technician.supplement.title')}
        description={order.title}
      />

      <div className="flex flex-col gap-2 rounded-xl border bg-card p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-heading text-base font-semibold">
            {t('technician.supplement.target', { n: target.attempt_number })}
          </span>
          <ReviewStatusBadge status={target.review_status ?? 'pending'} size="sm" />
        </div>
        <span className="text-xs text-muted-foreground">
          {t('ui.execution.submittedAt', { time: formatRelative(target.client_submitted_at, TZ) })} ·{' '}
          {t('ui.execution.submittedBy', { name: target.submitter.full_name })} ·{' '}
          {t('ui.photos.count', { count: target.photos.length })}
        </span>
        <p className="text-sm text-muted-foreground">{t('technician.supplement.targetHint')}</p>
      </div>

      {reviewed && (
        <Callout tone="warning" icon={TriangleAlert} title={t('ui.badge.lateSupplement')}>
          {t('technician.supplement.late')}
        </Callout>
      )}

      <SubmissionForm
        draftKey={key}
        draft={draft}
        participantOptions={order.participantOptions}
        descriptionLabel={t('technician.supplement.description')}
        descriptionPlaceholder={t('technician.supplement.descriptionPlaceholder')}
        photosHint={t('technician.supplement.photosHint')}
      />

      <ActionBar>
        {!canSend && <p className="text-center text-sm text-muted-foreground">{t('technician.supplement.required')}</p>}
        <Button
          className="h-12 text-base"
          disabled={!canSend}
          onClick={async () => {
            const result = await act(submit(order, key, target.id));
            if (!result) return;
            notify(t(result === 'queued' ? 'technician.supplement.queuedToast' : 'technician.supplement.sentToast'));
            void navigate({ to: '/technician/orders/$orderId', params: { orderId: order.id } });
          }}
        >
          <Send className="size-5" />
          {t('technician.supplement.send')}
        </Button>
      </ActionBar>
    </div>
  );
}
