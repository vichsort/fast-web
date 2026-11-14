// Fábricas para os testes da fila: banco novo por teste, rascunhos e fotos.
import { type Draft, type DraftPhoto, FastDb } from '../db';

export function newDb(): FastDb {
  return new FastDb(`test-${crypto.randomUUID()}`);
}

export async function addDraft(db: FastDb, fields: Partial<Draft> & Pick<Draft, 'userId' | 'orderId'>): Promise<Draft> {
  const draft: Draft = {
    id: crypto.randomUUID(),
    supplementsExecutionId: null,
    description: 'Troquei a câmera',
    participants: [fields.userId],
    clientStartedAt: '2026-11-13T10:00:00.000Z',
    state: 'editing',
    refusal: null,
    createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z',
    ...fields,
  };
  await db.drafts.add(draft);
  return draft;
}

export async function addPhoto(db: FastDb, draft: Draft, fields: Partial<DraftPhoto> = {}): Promise<DraftPhoto> {
  const photo: DraftPhoto = {
    id: crypto.randomUUID(),
    draftId: draft.id,
    userId: draft.userId,
    orderId: draft.orderId,
    blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
    source: 'camera',
    capturedAt: '2026-11-13T10:05:00.000Z',
    latitude: -23.56,
    longitude: -46.65,
    accuracyM: 12,
    width: 1600,
    height: 1200,
    uploaded: false,
    createdAt: new Date().toISOString(),
    ...fields,
  };
  await db.photos.add(photo);
  return photo;
}
