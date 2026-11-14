import { enqueueMaterials, enqueueStart, enqueueSubmit } from './enqueue';
import { addDraft, newDb } from './testing';

describe('enqueue', () => {
  it('Q1: start is queued with the device clock of the tap', async () => {
    const db = newDb();

    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: '2026-11-13T10:00:00.000Z' });

    const items = await db.queue.toArray();
    expect(items).toMatchObject([
      {
        userId: 'u1',
        orderId: 'o1',
        type: 'start',
        payload: { clientStartedAt: '2026-11-13T10:00:00.000Z' },
        state: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        lastError: null,
      },
    ]);
  });

  it('Q5: submit moves an editing draft to queued with the clock of the tap on "Enviar"', async () => {
    const db = newDb();
    const draft = await addDraft(db, { userId: 'u1', orderId: 'o1' });

    await enqueueSubmit(db, { userId: 'u1', draftId: draft.id, clientSubmittedAt: '2026-11-13T11:00:00.000Z' });

    expect(await db.drafts.get(draft.id)).toMatchObject({ state: 'queued' });
    expect(await db.queue.toArray()).toMatchObject([
      {
        userId: 'u1',
        orderId: 'o1',
        type: 'submit',
        payload: { draftId: draft.id, clientSubmittedAt: '2026-11-13T11:00:00.000Z', stagedPhotoIds: [] },
        state: 'pending',
      },
    ]);
  });

  it('Q1: a second tap on "Enviar" does not queue the draft twice', async () => {
    const db = newDb();
    const draft = await addDraft(db, { userId: 'u1', orderId: 'o1' });

    await enqueueSubmit(db, { userId: 'u1', draftId: draft.id, clientSubmittedAt: '2026-11-13T11:00:00.000Z' });
    await enqueueSubmit(db, { userId: 'u1', draftId: draft.id, clientSubmittedAt: '2026-11-13T11:00:05.000Z' });

    expect(await db.queue.toArray()).toMatchObject([{ payload: { clientSubmittedAt: '2026-11-13T11:00:00.000Z' } }]);
  });

  it('Q1: only an editing draft of the same user can be queued', async () => {
    const db = newDb();
    const refused = await addDraft(db, { userId: 'u1', orderId: 'o1', state: 'refused', refusal: 'order_closed' });
    const other = await addDraft(db, { userId: 'u2', orderId: 'o1' });
    const at = '2026-11-13T11:00:00.000Z';

    await expect(enqueueSubmit(db, { userId: 'u1', draftId: refused.id, clientSubmittedAt: at })).rejects.toThrow();
    await expect(enqueueSubmit(db, { userId: 'u1', draftId: other.id, clientSubmittedAt: at })).rejects.toThrow();
    await expect(enqueueSubmit(db, { userId: 'u1', draftId: 'missing', clientSubmittedAt: at })).rejects.toThrow();
    expect(await db.queue.count()).toBe(0);
    expect(await db.drafts.get(refused.id)).toMatchObject({ state: 'refused' });
  });

  it('Q1: materials is queued with the new text and the server text it was edited from', async () => {
    const db = newDb();

    await enqueueMaterials(db, { userId: 'u1', orderId: 'o1', text: '2 cabos', expected: '1 cabo' });

    expect(await db.queue.toArray()).toMatchObject([
      { userId: 'u1', orderId: 'o1', type: 'materials', payload: { text: '2 cabos', expected: '1 cabo' } },
    ]);
  });

  it('Q1: a new materials edit replaces the queued one in place, keeping the server text it started from', async () => {
    const db = newDb();
    await enqueueMaterials(db, { userId: 'u1', orderId: 'o1', text: '2 cabos', expected: '1 cabo' });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: '2026-11-13T10:00:00.000Z' });
    await enqueueMaterials(db, { userId: 'u2', orderId: 'o1', text: 'outro usuário', expected: null });

    await enqueueMaterials(db, { userId: 'u1', orderId: 'o1', text: '3 cabos', expected: '2 cabos' });

    const items = await db.queue.where('[userId+orderId]').equals(['u1', 'o1']).sortBy('id');
    expect(items).toMatchObject([
      { type: 'materials', payload: { text: '3 cabos', expected: '1 cabo' } },
      { type: 'start' },
    ]);
    expect(await db.queue.where('userId').equals('u2').count()).toBe(1);
  });
});
