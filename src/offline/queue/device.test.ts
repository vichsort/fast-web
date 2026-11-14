import { clearUser, dismissRefusal, listRefusals, pendingCount, retryBlocked } from './device';
import { enqueueMaterials, enqueueStart, enqueueSubmit } from './enqueue';
import { addDraft, addPhoto, newDb } from './testing';

const at = '2026-11-13T10:00:00.000Z';

describe('device', () => {
  it('Q10: clearing a user removes their drafts, photos, queue and refusals, and nothing of other users', async () => {
    const db = newDb();
    for (const userId of ['u1', 'u2']) {
      const draft = await addDraft(db, { userId, orderId: 'o1' });
      await addPhoto(db, draft);
      await enqueueSubmit(db, { userId, draftId: draft.id, clientSubmittedAt: at });
      await enqueueStart(db, { userId, orderId: 'o2', clientStartedAt: at });
      await db.refusals.add({
        userId,
        orderId: 'o3',
        type: 'start',
        payload: { clientStartedAt: at },
        code: 'order_closed',
        current: null,
        createdAt: at,
      });
    }

    await clearUser(db, 'u1');

    for (const table of [db.drafts, db.photos, db.queue, db.refusals] as const) {
      const owners = (await table.toArray()).map((row) => row.userId);
      expect([table.name, ...new Set(owners)]).toEqual([table.name, 'u2']);
    }
  });

  it('Q10: the pending count is the queue items of the user, blocked included', async () => {
    const db = newDb();
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    await enqueueMaterials(db, { userId: 'u1', orderId: 'o2', text: 'cabo', expected: null });
    await enqueueStart(db, { userId: 'u2', orderId: 'o1', clientStartedAt: at });
    await db.queue.where('orderId').equals('o2').modify({ state: 'blocked' });

    expect(await pendingCount(db, 'u1')).toBe(2);
    expect(await pendingCount(db, 'u3')).toBe(0);
  });

  it('Q6: a blocked item goes back to the queue when the technician asks', async () => {
    const db = newDb();
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    await db.queue.toCollection().modify({ state: 'blocked', lastError: '42501', attempts: 3, nextAttemptAt: 99 });
    const [item] = await db.queue.toArray();

    await retryBlocked(db, item?.id as number);

    expect(await db.queue.toArray()).toMatchObject([
      { state: 'pending', lastError: null, attempts: 0, nextAttemptAt: 0 },
    ]);
  });

  it('Q6: refusals are listed for their user until the technician dismisses them', async () => {
    const db = newDb();
    const refusal = {
      orderId: 'o1',
      type: 'start' as const,
      payload: { clientStartedAt: at },
      current: null,
      createdAt: at,
    };
    await db.refusals.add({ ...refusal, userId: 'u1', code: 'order_closed' });
    await db.refusals.add({ ...refusal, userId: 'u2', code: 'order_closed' });
    await db.refusals.add({ ...refusal, userId: 'u1', code: 'not_assigned' });

    const listed = await listRefusals(db, 'u1');
    expect(listed.map((r) => r.code)).toEqual(['order_closed', 'not_assigned']);

    await dismissRefusal(db, listed[0]?.id as number);
    expect((await listRefusals(db, 'u1')).map((r) => r.code)).toEqual(['not_assigned']);
  });
});
