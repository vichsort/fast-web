// Tentativa e complementos (04): o que a dupla enviou, com fotos, alertas e o resultado da revisão. Usado na revisão
// do escritório e no detalhe da O.S. do técnico ("resultado e motivo da última rejeição").
import { Clock, FilePlus, Send, Users } from 'lucide-react';
import type * as React from 'react';
import type { ReviewStatus } from '@/lib/enums';
import { formatDateTime, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExecutionAlert } from '@/photos/alerts';
import { AlertBadge, LateSupplementBadge, ReviewStatusBadge, ToneBadge } from './badges';
import { type PhotoData, PhotoGrid } from './photos';
import { reviewVar } from './tone';
import { AvatarStack } from './user';

interface Person {
  id: string;
  full_name: string;
}

/** Um envio (tentativa ou complemento). ExecutionView dos mocks satisfaz. */
export interface ExecutionData {
  id: string;
  description: string | null;
  submitter: Person;
  participant_refs: Person[];
  client_started_at: string | null;
  client_submitted_at: string;
  received_at: string;
  converted_to_supplement: boolean;
  is_late: boolean;
  acknowledged_at: string | null;
  acknowledger: Person | null;
  photos: PhotoData[];
}

export interface AttemptData extends ExecutionData {
  attempt_number: number;
  review_status: ReviewStatus | null;
  review_comment: string | null;
  reviewed_at: string | null;
  reviewer: Person | null;
  alerts: ExecutionAlert[];
  supplements: ExecutionData[];
}

export interface ExecutionCardProps extends React.ComponentProps<'article'> {
  attempt: AttemptData;
  timeZone: string;
  now?: Date;
  /** Botões da revisão (aprovar, rejeitar) ou "dar ciência". */
  actions?: React.ReactNode;
  /** Esconde os complementos (lista resumida). */
  hideSupplements?: boolean;
  /** Grade de fotos compacta. */
  compactPhotos?: boolean;
}

function Times({ e, timeZone, now }: { e: ExecutionData; timeZone: string; now?: Date }) {
  // O horário do aparelho (enviou) pode ser bem anterior à chegada (fila offline): mostra os dois quando diferem.
  const delayed = Date.parse(e.received_at) - Date.parse(e.client_submitted_at) > 10 * 60_000;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
      {e.client_started_at && (
        <span title={formatDateTime(e.client_started_at, timeZone)}>
          {t('ui.execution.startedAt', { time: formatDateTime(e.client_started_at, timeZone) })}
        </span>
      )}
      <span className="inline-flex items-center gap-1" title={formatDateTime(e.client_submitted_at, timeZone)}>
        <Send aria-hidden className="size-3" />
        {t('ui.execution.submittedAt', { time: formatRelative(e.client_submitted_at, timeZone, now) })}
      </span>
      {delayed && (
        <span className="inline-flex items-center gap-1" title={formatDateTime(e.received_at, timeZone)}>
          <Clock aria-hidden className="size-3" />
          {t('ui.execution.receivedAt', { time: formatRelative(e.received_at, timeZone, now) })}
        </span>
      )}
    </div>
  );
}

function Who({ e }: { e: ExecutionData }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-medium">{e.submitter.full_name}</span>
      {e.participant_refs.length > 1 && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Users aria-hidden className="size-3.5" />
          <span className="sr-only">{t('ui.execution.participants')}</span>
          <AvatarStack people={e.participant_refs} size="xs" showNames />
        </span>
      )}
    </div>
  );
}

/** Cartão de uma tentativa com revisão, alertas, fotos e os complementos dela. */
export function ExecutionCard({
  attempt,
  timeZone,
  now,
  actions,
  hideSupplements,
  compactPhotos,
  className,
  ...props
}: ExecutionCardProps) {
  const status = attempt.review_status ?? 'pending';
  const rejected = status === 'rejected';
  return (
    <article
      data-slot="execution-card"
      className={cn(
        'flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-(--space-card) text-card-foreground shadow-xs',
        className,
      )}
      {...props}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold">
              {t('ui.execution.attempt', { n: attempt.attempt_number })}
            </h3>
            <ReviewStatusBadge status={status} size="sm" />
            {attempt.alerts.map((alert) => (
              <AlertBadge key={alert} code={alert} size="sm" />
            ))}
          </div>
          <Who e={attempt} />
          <Times e={attempt} timeZone={timeZone} now={now} />
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>

      {(attempt.review_comment || (attempt.reviewer && attempt.reviewed_at)) && (
        <div className={cn('tone-soft flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm', reviewVar[status])}>
          <span className="text-xs font-semibold">
            {t(rejected ? 'ui.execution.rejectionReason' : 'ui.execution.approvalComment')}
            {attempt.reviewer && attempt.reviewed_at && (
              <span className="font-normal opacity-80">
                {' · '}
                {t('ui.execution.reviewedBy', {
                  name: attempt.reviewer.full_name,
                  time: formatRelative(attempt.reviewed_at, timeZone, now),
                })}
              </span>
            )}
          </span>
          {attempt.review_comment && <p className="whitespace-pre-line text-foreground">{attempt.review_comment}</p>}
        </div>
      )}

      <p className={cn('text-sm whitespace-pre-line', !attempt.description && 'text-muted-foreground italic')}>
        {attempt.description ?? t('ui.execution.noDescription')}
      </p>

      {attempt.photos.length > 0 && (
        <PhotoGrid photos={attempt.photos} timeZone={timeZone} density={compactPhotos ? 'compact' : 'comfortable'} />
      )}

      {!hideSupplements && attempt.supplements.length > 0 && (
        <ol className="flex flex-col gap-3 border-t pt-4">
          {attempt.supplements.map((s) => (
            <li key={s.id}>
              <SupplementBlock supplement={s} timeZone={timeZone} now={now} compactPhotos={compactPhotos} />
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

/** Um complemento: quem, quando, se foi convertido (04, R4), se é tardio e visto (R11), texto e fotos. */
export function SupplementBlock({
  supplement: s,
  timeZone,
  now,
  compactPhotos,
  className,
}: {
  supplement: ExecutionData;
  timeZone: string;
  now?: Date;
  compactPhotos?: boolean;
  className?: string;
}) {
  const unseen = s.is_late && !s.acknowledged_at;
  return (
    <div
      data-slot="supplement"
      data-unseen={unseen || undefined}
      className={cn(
        'flex flex-col gap-2 rounded-lg border-l-2 bg-muted/40 py-2.5 pr-3 pl-3',
        unseen ? 'tone-border tone-wash [--tone:var(--late-supplement)]' : 'border-border',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <FilePlus aria-hidden className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{t('ui.execution.supplement')}</span>
        {s.converted_to_supplement && (
          <ToneBadge tone="info" variant="outline" size="sm" label={t('ui.badge.converted')} />
        )}
        {s.is_late && <LateSupplementBadge size="sm" variant={unseen ? 'solid' : 'outline'} />}
        {unseen && <ToneBadge tone="warning" size="sm" label={t('ui.badge.unseen')} />}
      </div>
      <Who e={s} />
      <Times e={s} timeZone={timeZone} now={now} />
      {s.description && <p className="text-sm whitespace-pre-line">{s.description}</p>}
      {s.photos.length > 0 && (
        <PhotoGrid photos={s.photos} timeZone={timeZone} density={compactPhotos ? 'compact' : 'comfortable'} />
      )}
      {s.acknowledged_at && s.acknowledger && (
        <span className="text-xs text-muted-foreground">
          {t('ui.execution.acknowledgedBy', {
            name: s.acknowledger.full_name,
            time: formatRelative(s.acknowledged_at, timeZone, now),
          })}
        </span>
      )}
    </div>
  );
}
