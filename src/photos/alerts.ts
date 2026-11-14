// Alertas da prova fotográfica (docs/photos.md, F7): funções puras, usadas na revisão do escritório e no aparelho.
// A tela traduz o código com t('alerts.<código>').
import type { PhotoSource } from '@/offline/db';

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
