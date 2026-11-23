// Decisão da revisão (04): resumo (fotos, complementos, alertas), alertas por extenso, aprovar com comentário opcional
// ou rejeitar com justificativa, e o cenário de exemplo do stale_review.
import { CircleCheck, CircleX } from 'lucide-react';
import * as React from 'react';
import { AlertList } from '@/components/alert-list';
import { ConfirmDialog, ReasonDialog } from '@/components/dialogs';
import { Section } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { PhotoAlert } from '@/photos/alerts';
import { ScratchScenario } from '../../shared';
import type { pendingSummary } from '../queue';

type Summary = NonNullable<ReturnType<typeof pendingSummary>>;
export type Decide = (decision: 'approved' | 'rejected', text: string | null) => Promise<void>;

export function DecisionSection({
  summary,
  stale,
  simulateStale,
  onSimulateStaleChange,
  onDecide,
}: {
  summary: Summary;
  stale: boolean;
  simulateStale: boolean;
  onSimulateStaleChange: (checked: boolean) => void;
  onDecide: Decide;
}) {
  return (
    <Section title={t('office.review.decisionTitle')} description={t('office.review.decisionDescription')}>
      <ReviewSummary summary={summary} />
      <ReviewAlerts summary={summary} />
      <DecisionActions disabled={stale} onDecide={onDecide} />
      <ScratchScenario
        label={t('office.review.staleScenario')}
        hint={t('office.review.staleScenarioHint')}
        checked={simulateStale}
        onCheckedChange={onSimulateStaleChange}
      />
    </Section>
  );
}

function ReviewSummary({ summary: { attempt, photos, alerts } }: { summary: Summary }) {
  return (
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
  );
}

function ReviewAlerts({ summary: { attempt, photos } }: { summary: Summary }) {
  const photoAlertCounts = (['gallery_without_exif', 'gallery_before_start'] as PhotoAlert[])
    .map((code) => ({ code, count: photos.filter((p) => p.alerts.includes(code)).length }))
    .filter((x) => x.count > 0);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-muted-foreground">{t('office.review.alertsTitle')}</span>
      {attempt.alerts.length === 0 && photoAlertCounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('office.review.noAlerts')}</p>
      ) : (
        <AlertList
          alerts={[
            ...attempt.alerts.map((code) => ({ code })),
            ...photoAlertCounts.map(({ code, count }) => ({
              code,
              text: t('office.review.photoAlertCount', { count, text: t(`alerts.${code}`) }),
            })),
          ]}
        />
      )}
    </div>
  );
}

function DecisionActions({ disabled, onDecide }: { disabled: boolean; onDecide: Decide }) {
  const [comment, setComment] = React.useState('');
  return (
    <div className="flex flex-col gap-2 pt-1">
      <ConfirmDialog
        trigger={
          <Button disabled={disabled} className="w-full">
            <CircleCheck />
            {t('office.review.approve')}
          </Button>
        }
        title={t('ui.dialogs.approveTitle')}
        description={t('ui.dialogs.approveDescription')}
        confirmLabel={t('ui.dialogs.approveConfirm')}
        onOpenChange={(open) => !open && setComment('')}
        onConfirm={() => onDecide('approved', comment)}
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
          <Button variant="outline" disabled={disabled} className="w-full text-destructive hover:text-destructive">
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
        onConfirm={(reason) => onDecide('rejected', reason)}
      />
    </div>
  );
}
