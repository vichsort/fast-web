import { FastDb } from './db';

describe('local db', () => {
  it('declares the whole schema in a single version (nothing published before it)', async () => {
    const db = new FastDb(`test-${crypto.randomUUID()}`);
    await db.open();

    expect(db.verno).toBe(1);
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['cache', 'drafts', 'photos', 'queue', 'refusals', 'seen', 'seenPhotos'].sort(),
    );
    db.close();
  });

  it('keeps drafts, photos and queue items per user and order', async () => {
    const db = new FastDb(`test-${crypto.randomUUID()}`);
    const now = new Date().toISOString();
    await db.queue.bulkAdd([
      {
        format: 1,
        userId: 'u1',
        orderId: 'o1',
        type: 'start',
        payload: { clientStartedAt: now },
        state: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        waitingFor: null,
        lastError: null,
        createdAt: now,
      },
      {
        format: 1,
        userId: 'u2',
        orderId: 'o1',
        type: 'start',
        payload: { clientStartedAt: now },
        state: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        waitingFor: null,
        lastError: null,
        createdAt: now,
      },
      {
        format: 1,
        userId: 'u1',
        orderId: 'o1',
        type: 'materials',
        payload: { text: 'cabo', expected: null },
        state: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        waitingFor: null,
        lastError: null,
        createdAt: now,
      },
    ]);

    const items = await db.queue.where('[userId+orderId]').equals(['u1', 'o1']).sortBy('id');

    expect(items.map((i) => i.type)).toEqual(['start', 'materials']);
    db.close();
  });
});
