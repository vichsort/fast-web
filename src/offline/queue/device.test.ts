import { clearUser, pendingCount } from './device';
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
});
