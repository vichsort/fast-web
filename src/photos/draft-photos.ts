// Guardar e tirar fotos do rascunho (docs/photos.md, F5 e F6), no banco local do técnico.
import type { DraftPhoto, FastDb } from '@/offline/db';
import { PhotoError } from './errors';
import type { ProcessedPhoto } from './types';

/**
 * Guarda a foto num rascunho `editing` do usuário. Resolve só depois de o IndexedDB confirmar a gravação:
 * antes disso, a tela não marca a foto como salva.
 */
export async function savePhotoToDraft(
  db: FastDb,
  input: { draftId: string; userId: string; photo: ProcessedPhoto },
): Promise<DraftPhoto> {
  return db.transaction('rw', db.drafts, db.photos, async () => {
    const draft = await db.drafts.get(input.draftId);
    if (!draft || draft.userId !== input.userId || draft.state !== 'editing') {
      throw new PhotoError('draft_not_editable');
    }
    const { blob, source, width, height, capturedAt, latitude, longitude, accuracyM } = input.photo;
    const row: DraftPhoto = {
      id: crypto.randomUUID(),
      draftId: draft.id,
      userId: draft.userId,
      orderId: draft.orderId,
      blob,
      source,
      capturedAt,
      latitude,
      longitude,
      accuracyM,
      width,
      height,
      uploaded: false,
      createdAt: new Date().toISOString(),
    };
    await db.photos.add(row);
    return row;
  });
}
