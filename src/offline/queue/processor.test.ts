import type { StartExecutionArgs } from './api';
import { enqueueStart } from './enqueue';
import { ApiError, type ErrorClass } from './errors';
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

  it.each<ErrorClass>(['network', 'server'])(
    'Q2, Q6: a %s failure keeps the item and waits only on that order',
    async (errorClass) => {
      const db = newDb();
      const clock = fakeClock();
      const { api, calls } = fakeApi({
        startExecution: async (args: StartExecutionArgs) => {
          if (args.p_order_id === 'o1') throw new ApiError(errorClass, null, 'offline');
        },
      });
      await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
      await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
      await enqueueStart(db, { userId: 'u1', orderId: 'o2', clientStartedAt: at });

      const status = await processQueue({ db, api, lock: noLock, clock, userId: 'u1' });

      expect(calls.map((c) => (c.args[0] as StartExecutionArgs).p_order_id)).toEqual(['o1', 'o2']);
      expect(await db.queue.orderBy('id').toArray()).toMatchObject([
        { orderId: 'o1', state: 'pending', attempts: 1, nextAttemptAt: clock.now() + 5_000, lastError: 'offline' },
        { orderId: 'o1', state: 'pending', attempts: 0, nextAttemptAt: 0 },
      ]);
      expect(status).toEqual({ kind: 'waiting', retryAt: clock.now() + 5_000 });
    },
  );
});
