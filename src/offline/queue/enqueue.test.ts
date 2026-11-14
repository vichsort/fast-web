import { enqueueStart } from './enqueue';
import { newDb } from './testing';

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
});
