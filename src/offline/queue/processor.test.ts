import { enqueueStart } from './enqueue';
import { processQueue } from './processor';
import { fakeApi, fakeClock, newDb, noLock } from './testing';

const at = '2026-11-13T10:00:00.000Z';

describe('processQueue', () => {
  it('Q1: a start item calls start_execution with the device clock and leaves the queue', async () => {
    const db = newDb();
    const { api, calls } = fakeApi();
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });

    const status = await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

    expect(calls).toEqual([{ method: 'startExecution', args: [{ p_order_id: 'o1', p_client_started_at: at }] }]);
    expect(await db.queue.count()).toBe(0);
    expect(status).toEqual({ kind: 'idle' });
  });
});
