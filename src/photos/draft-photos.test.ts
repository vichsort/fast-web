import Dexie from 'dexie';
import { type Draft, FastDb } from '@/offline/db';
import { removePhotoFromDraft, savePhotoToDraft } from './draft-photos';
import { PhotoError } from './errors';
import type { ProcessedPhoto } from './types';

let db: FastDb;

beforeEach(() => {
  db = new FastDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

const draft = (overrides: Partial<Draft> = {}): Draft => ({
  id: crypto.randomUUID(),
  userId: 'tech-1',
  orderId: 'order-1',
  supplementsExecutionId: null,
  description: '',
  participants: ['tech-1'],
  clientStartedAt: null,
  state: 'editing',
  refusal: null,
  createdAt: '2026-11-13T10:00:00Z',
  updatedAt: '2026-11-13T10:00:00Z',
  ...overrides,
});

const photo = (): ProcessedPhoto => ({
  blob: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }),
  source: 'gallery',
  width: 1600,
  height: 1200,
  capturedAt: '2026-11-13T09:30:00.000Z',
  latitude: -23.56,
  longitude: -46.65,
  accuracyM: 12,
});

const expectPhotoError = async (promise: Promise<unknown>, code: PhotoError['code']) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(PhotoError);
  expect((error as PhotoError).code).toBe(code);
};

describe('save photo to draft', () => {
  it('F5: saves the photo in an editing draft of the same user, not uploaded, with the order of the draft', async () => {
    const d = draft();
    await db.drafts.add(d);

    const saved = await savePhotoToDraft(db, { draftId: d.id, userId: 'tech-1', photo: photo() });

    const stored = await db.photos.get(saved.id);
    expect(stored).toMatchObject({
      draftId: d.id,
      userId: 'tech-1',
      orderId: 'order-1',
      source: 'gallery',
      width: 1600,
      height: 1200,
      capturedAt: '2026-11-13T09:30:00.000Z',
      latitude: -23.56,
      longitude: -46.65,
      accuracyM: 12,
      uploaded: false,
    });
    expect(stored?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(stored?.blob.size).toBe(4);
    expect(stored?.blob.type).toBe('image/jpeg');
    expect(Number.isNaN(Date.parse(stored?.createdAt ?? ''))).toBe(false);
  });

  it('F5: refuses a draft of another user', async () => {
    const d = draft({ userId: 'tech-2' });
    await db.drafts.add(d);

    await expectPhotoError(
      savePhotoToDraft(db, { draftId: d.id, userId: 'tech-1', photo: photo() }),
      'draft_not_editable',
    );
    expect(await db.photos.count()).toBe(0);
  });

  it.each(['queued', 'refused'] as const)('F5: refuses a %s draft', async (state) => {
    const d = draft({ state });
    await db.drafts.add(d);

    await expectPhotoError(
      savePhotoToDraft(db, { draftId: d.id, userId: 'tech-1', photo: photo() }),
      'draft_not_editable',
    );
    expect(await db.photos.count()).toBe(0);
  });

  it('F5: refuses a draft that does not exist', async () => {
    await expectPhotoError(
      savePhotoToDraft(db, { draftId: crypto.randomUUID(), userId: 'tech-1', photo: photo() }),
      'draft_not_editable',
    );
    expect(await db.photos.count()).toBe(0);
  });

  const quotaError = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError');

  it('F5: when IndexedDB refuses the write for lack of space, throws storage_full and keeps nothing', async () => {
    const d = draft();
    await db.drafts.add(d);
    vi.spyOn(db.photos, 'add').mockRejectedValue(quotaError());

    await expectPhotoError(savePhotoToDraft(db, { draftId: d.id, userId: 'tech-1', photo: photo() }), 'storage_full');
    vi.restoreAllMocks();
    expect(await db.photos.count()).toBe(0);
  });

  it('F5: a quota error that aborts the transaction on commit is also storage_full', async () => {
    const d = draft();
    await db.drafts.add(d);
    // No IndexedDB real, a cota estoura no commit: o Dexie rejeita com AbortError e a causa em `inner`.
    vi.spyOn(db.photos, 'add').mockRejectedValue(new Dexie.AbortError('Transaction aborted', quotaError()));

    await expectPhotoError(savePhotoToDraft(db, { draftId: d.id, userId: 'tech-1', photo: photo() }), 'storage_full');
    vi.restoreAllMocks();
    expect(await db.photos.count()).toBe(0);
  });

  it('F5: other write errors are not storage_full', async () => {
    const d = draft();
    await db.drafts.add(d);
    const boom = new DOMException('Something else.', 'UnknownError');
    vi.spyOn(db.photos, 'add').mockRejectedValue(boom);

    const error = await savePhotoToDraft(db, { draftId: d.id, userId: 'tech-1', photo: photo() }).catch((e) => e);
    vi.restoreAllMocks();
    expect(error).not.toBeInstanceOf(PhotoError);
    expect(await db.photos.count()).toBe(0);
  });
});

describe('remove photo from draft', () => {
  const draftWithPhoto = async (overrides: Partial<Draft> = {}) => {
    const d = draft();
    await db.drafts.add(d);
    const saved = await savePhotoToDraft(db, { draftId: d.id, userId: 'tech-1', photo: photo() });
    if (Object.keys(overrides).length > 0) await db.drafts.update(d.id, overrides);
    return saved.id;
  };

  it('F6: removes the photo from an editing draft', async () => {
    const photoId = await draftWithPhoto();

    await removePhotoFromDraft(db, { photoId, userId: 'tech-1' });

    expect(await db.photos.get(photoId)).toBeUndefined();
  });

  it.each(['queued', 'refused'] as const)('F6: refuses when the draft is %s', async (state) => {
    const photoId = await draftWithPhoto({ state });

    await expectPhotoError(removePhotoFromDraft(db, { photoId, userId: 'tech-1' }), 'draft_not_editable');
    expect(await db.photos.get(photoId)).toBeDefined();
  });

  it('F6: refuses a photo of another user', async () => {
    const photoId = await draftWithPhoto();

    await expectPhotoError(removePhotoFromDraft(db, { photoId, userId: 'tech-2' }), 'draft_not_editable');
    expect(await db.photos.get(photoId)).toBeDefined();
  });

  it('F6: removing a photo that is already gone does nothing (double tap)', async () => {
    const photoId = await draftWithPhoto();
    await removePhotoFromDraft(db, { photoId, userId: 'tech-1' });

    await expect(removePhotoFromDraft(db, { photoId, userId: 'tech-1' })).resolves.toBeUndefined();
  });
});
