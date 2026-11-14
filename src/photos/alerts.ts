// Alertas da prova fotográfica (docs/photos.md, F7): funções puras, usadas na revisão do escritório e no aparelho.
// A tela traduz o código com t('alerts.<código>').
import type { Database } from '@/lib/database.types';
import type { PhotoSource } from '@/offline/db';

type ReviewStatus = Database['public']['Enums']['review_status'];

export type PhotoAlert = 'gallery_without_exif' | 'gallery_before_start';

/** Horários ISO 8601 com fusos diferentes: compara o instante, nunca o texto. */
const isBefore = (a: string, b: string) => Date.parse(a) < Date.parse(b);

/** Alertas de uma foto, dada a execução a que ela pertence. */
export function photoAlerts(
  photo: { source: PhotoSource; capturedAt: string | null },
  execution: { clientStartedAt: string | null },
): PhotoAlert[] {
  if (photo.source !== 'gallery') return [];
  if (photo.capturedAt === null) return ['gallery_without_exif'];
  if (execution.clientStartedAt !== null && isBefore(photo.capturedAt, execution.clientStartedAt)) {
    return ['gallery_before_start'];
  }
  return [];
}

export type ExecutionAlert = 'submitted_before_rejection' | 'late_delivery';

/**
 * Alertas de uma tentativa. A rejeição anterior é a mais recente da mesma O.S. revisada antes de a tentativa
 * chegar (`received_at`); tentativa que ainda não chegou (na fila do aparelho) compara com a mais recente.
 */
export function executionAlerts(
  attempt: { clientSubmittedAt: string; receivedAt: string | null },
  order: { dueAt: string | null },
  orderAttempts: { reviewStatus: ReviewStatus | null; reviewedAt: string | null }[],
): ExecutionAlert[] {
  const alerts: ExecutionAlert[] = [];
  const { receivedAt } = attempt;
  const previousRejection = orderAttempts
    .flatMap((a) => (a.reviewStatus === 'rejected' && a.reviewedAt !== null ? [a.reviewedAt] : []))
    .filter((reviewedAt) => receivedAt === null || isBefore(reviewedAt, receivedAt))
    .reduce<string | null>((latest, r) => (latest === null || isBefore(latest, r) ? r : latest), null);
  if (previousRejection !== null && isBefore(attempt.clientSubmittedAt, previousRejection)) {
    alerts.push('submitted_before_rejection');
  }
  if (order.dueAt !== null && isBefore(order.dueAt, attempt.clientSubmittedAt)) alerts.push('late_delivery');
  return alerts;
}
