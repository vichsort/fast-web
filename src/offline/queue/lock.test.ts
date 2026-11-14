import type { QueueLock, StartExecutionArgs } from './api';
import { enqueueStart } from './enqueue';
import { webLock } from './lock';
import { processQueue } from './processor';
import { fakeApi, fakeClock, newDb } from './testing';

const at = '2026-11-13T10:00:00.000Z';

describe('lock', () => {
  it('Q9: the queue is processed inside the injected lock', async () => {
    const db = newDb();
    let held = false;
    const lock: QueueLock = async (fn) => {
      held = true;
      try {
        return await fn();
      } finally {
        held = false;
      }
    };
    const seen: boolean[] = [];
    const { api } = fakeApi({
      startExecution: async () => {
        seen.push(held);
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });

    await processQueue({ db, api, lock, clock: fakeClock(), userId: 'u1' });

    expect(seen).toEqual([true]);
  });

  it('Q9: with the Web Locks lock, two processors awake together send each item once', async () => {
    const db = newDb();
    let running = 0;
    let maxRunning = 0;
    const { api, calls } = fakeApi({
      startExecution: async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    await enqueueStart(db, { userId: 'u1', orderId: 'o2', clientStartedAt: at });
    const deps = { db, api, lock: webLock(), clock: fakeClock(), userId: 'u1' };

    await Promise.all([processQueue(deps), processQueue(deps)]);

    expect(calls.map((c) => (c.args[0] as StartExecutionArgs).p_order_id)).toEqual(['o1', 'o2']);
    expect(maxRunning).toBe(1);
  });
});
