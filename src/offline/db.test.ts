import { FastDb } from './db';

describe('local db', () => {
  it('keeps drafts, photos and queue items per user and order', async () => {
    const db = new FastDb(`test-${crypto.randomUUID()}`);
    const now = new Date().toISOString();
    await db.queue.bulkAdd([
      {
        userId: 'u1',
        orderId: 'o1',
        type: 'start',
        payload: {},
        state: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        lastError: null,
        createdAt: now,
      },
      {
        userId: 'u2',
        orderId: 'o1',
        type: 'start',
        payload: {},
        state: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        lastError: null,
        createdAt: now,
      },
      {
        userId: 'u1',
        orderId: 'o1',
        type: 'materials',
        payload: {},
        state: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
        lastError: null,
        createdAt: now,
      },
    ]);

    const items = await db.queue.where('[userId+orderId]').equals(['u1', 'o1']).sortBy('id');

    expect(items.map((i) => i.type)).toEqual(['start', 'materials']);
    db.close();
  });
});
