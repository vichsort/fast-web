// Fábricas para os testes da fila: banco novo por teste, rascunhos e fotos.
import { type Draft, type DraftPhoto, FastDb } from '../db';
import type { Clock, QueueApi, QueueLock } from './api';

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

type Call = { method: keyof QueueApi; args: unknown[] };

/** API falsa: tudo dá certo, salvo o que `overrides` trocar. `calls` guarda cada chamada, na ordem. */
export function fakeApi(overrides: Partial<QueueApi> = {}): { api: QueueApi; calls: Call[] } {
  const calls: Call[] = [];
  const impl: QueueApi = {
    startExecution: async () => {},
    submitExecution: async () => {},
    updateMaterialsNotes: async (args) => ({ materials_notes: args.p_text ?? null }),
    requestPhotoUpload: async (photo) => ({ already_uploaded: false, upload_url: `https://r2.test/${photo.photo_id}` }),
    uploadPhoto: async () => {},
    confirmPhotoUpload: async () => {},
    refreshSession: async () => true,
    ...overrides,
  };
  const api = Object.fromEntries(
    Object.entries(impl).map(([method, fn]) => [
      method,
      (...args: unknown[]) => {
        calls.push({ method: method as keyof QueueApi, args });
        return (fn as (...a: unknown[]) => unknown)(...args);
      },
    ]),
  ) as unknown as QueueApi;
  return { api, calls };
}

export function fakeClock(start = 1_000_000): Clock & { advance(ms: number): void } {
  let now = start;
  return {
    now: () => now,
    advance: (ms) => {
      now += ms;
    },
  };
}

export const noLock: QueueLock = (fn) => fn();
