import type { StartExecutionArgs, UpdateMaterialsNotesArgs } from './api';
import { enqueueMaterials, enqueueStart } from './enqueue';
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

      // o2 deu certo: a espera de o1 zera (Q7) e o1 é tentado de novo.
      expect(calls.map((c) => (c.args[0] as StartExecutionArgs).p_order_id)).toEqual(['o1', 'o2', 'o1']);
      expect(await db.queue.orderBy('id').toArray()).toMatchObject([
        { orderId: 'o1', state: 'pending', attempts: 1, nextAttemptAt: clock.now() + 5_000, lastError: 'offline' },
        { orderId: 'o1', state: 'pending', attempts: 0, nextAttemptAt: 0 },
      ]);
      expect(status).toEqual({ kind: 'waiting', retryAt: clock.now() + 5_000 });
    },
  );

  it('Q7: the wait doubles at each failure, from 5 s up to 5 min', async () => {
    const db = newDb();
    const clock = fakeClock();
    const { api } = fakeApi({
      startExecution: async () => {
        throw new ApiError('network', null, 'offline');
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    const waits: number[] = [];

    for (let i = 0; i < 8; i++) {
      const status = await processQueue({ db, api, lock: noLock, clock, userId: 'u1' });
      if (status.kind !== 'waiting') throw new Error(status.kind);
      waits.push((status.retryAt - clock.now()) / 1000);
      clock.advance(status.retryAt - clock.now());
    }

    expect(waits).toEqual([5, 10, 20, 40, 80, 160, 300, 300]);
  });

  it('Q7: a success on any item clears the wait of the items waiting for the network', async () => {
    const db = newDb();
    const clock = fakeClock();
    let online = false;
    const { api, calls } = fakeApi({
      startExecution: async (args: StartExecutionArgs) => {
        if (!online || args.p_order_id === 'o2') throw new ApiError('network', null, 'offline');
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    await processQueue({ db, api, lock: noLock, clock, userId: 'u1' });
    clock.advance(1_000);
    online = true;
    await enqueueStart(db, { userId: 'u1', orderId: 'o2', clientStartedAt: at });
    await enqueueStart(db, { userId: 'u1', orderId: 'o3', clientStartedAt: at });
    calls.length = 0;

    const status = await processQueue({ db, api, lock: noLock, clock, userId: 'u1' });

    expect(calls.map((c) => (c.args[0] as StartExecutionArgs).p_order_id)).toEqual(['o2', 'o3', 'o1', 'o2']);
    expect(await db.queue.toArray()).toMatchObject([{ orderId: 'o2', attempts: 1 }]);
    expect(status).toEqual({ kind: 'waiting', retryAt: clock.now() + 5_000 });
  });

  it("Q3: only the logged user's items are sent; the others stay untouched", async () => {
    const db = newDb();
    const { api, calls } = fakeApi();
    await enqueueStart(db, { userId: 'u2', orderId: 'o1', clientStartedAt: at });
    await enqueueStart(db, { userId: 'u1', orderId: 'o2', clientStartedAt: at });

    const status = await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

    expect(calls.map((c) => (c.args[0] as StartExecutionArgs).p_order_id)).toEqual(['o2']);
    expect(await db.queue.toArray()).toMatchObject([{ userId: 'u2', orderId: 'o1', attempts: 0 }]);
    expect(status).toEqual({ kind: 'idle' });
  });

  it('Q6: a bug blocks the item with the error, never drops it, and the other orders go on', async () => {
    const db = newDb();
    const { api, calls } = fakeApi({
      startExecution: async (args: StartExecutionArgs) => {
        if (args.p_order_id === 'o1') throw new ApiError('bug', '42501', '403 42501 permission denied');
        if (args.p_order_id === 'o2') throw new TypeError('unexpected');
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    await enqueueStart(db, { userId: 'u1', orderId: 'o2', clientStartedAt: at });
    await enqueueStart(db, { userId: 'u1', orderId: 'o3', clientStartedAt: at });

    const status = await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

    expect(calls.map((c) => (c.args[0] as StartExecutionArgs).p_order_id)).toEqual(['o1', 'o2', 'o3']);
    expect(await db.queue.orderBy('id').toArray()).toMatchObject([
      { orderId: 'o1', state: 'blocked', attempts: 0, lastError: '403 42501 permission denied' },
      { orderId: 'o1', state: 'pending' },
      { orderId: 'o2', state: 'blocked', lastError: 'TypeError: unexpected' },
    ]);
    expect(status).toEqual({ kind: 'idle' });
  });

  it('Q6: a session error renews the session and tries again', async () => {
    const db = newDb();
    let expired = true;
    const { api, calls } = fakeApi({
      startExecution: async () => {
        if (expired) throw new ApiError('session', 'PGRST303', 'JWT expired');
      },
      refreshSession: async () => {
        expired = false;
        return true;
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });

    const status = await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

    expect(calls.map((c) => c.method)).toEqual(['startExecution', 'refreshSession', 'startExecution']);
    expect(await db.queue.count()).toBe(0);
    expect(status).toEqual({ kind: 'idle' });
  });

  it('Q6: when the renewal fails, the whole queue stops and asks for login', async () => {
    const db = newDb();
    const { api, calls } = fakeApi({
      startExecution: async () => {
        throw new ApiError('session', null, '401');
      },
      refreshSession: async () => false,
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    await enqueueStart(db, { userId: 'u1', orderId: 'o2', clientStartedAt: at });

    const status = await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

    expect(calls.map((c) => c.method)).toEqual(['startExecution', 'refreshSession']);
    expect(await db.queue.orderBy('id').toArray()).toMatchObject([
      { orderId: 'o1', state: 'pending', attempts: 0, nextAttemptAt: 0 },
      { orderId: 'o2', state: 'pending', attempts: 0, nextAttemptAt: 0 },
    ]);
    expect(status).toEqual({ kind: 'needs_login' });
  });

  it('Q6: a session error again right after a renewal asks for login', async () => {
    const db = newDb();
    const { api, calls } = fakeApi({
      startExecution: async () => {
        throw new ApiError('session', null, '401');
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });

    const status = await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

    expect(calls.map((c) => c.method)).toEqual(['startExecution', 'refreshSession', 'startExecution']);
    expect(status).toEqual({ kind: 'needs_login' });
  });

  it('Q6: a renewal that fails for lack of network makes the item wait', async () => {
    const db = newDb();
    const clock = fakeClock();
    const { api } = fakeApi({
      startExecution: async () => {
        throw new ApiError('session', null, '401');
      },
      refreshSession: async () => {
        throw new ApiError('network', null, 'offline');
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });

    const status = await processQueue({ db, api, lock: noLock, clock, userId: 'u1' });

    expect(await db.queue.toArray()).toMatchObject([{ attempts: 1, lastError: 'offline' }]);
    expect(status).toEqual({ kind: 'waiting', retryAt: clock.now() + 5_000 });
  });

  it('Q6: a rule refusal of start drops the item and keeps the reason for the screen', async () => {
    const db = newDb();
    const { api, calls } = fakeApi({
      startExecution: async () => {
        throw new ApiError('rule', 'order_closed', 'order_closed');
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });

    const status = await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

    expect(calls).toHaveLength(2);
    expect(await db.queue.count()).toBe(0);
    expect(await db.refusals.toArray()).toMatchObject([
      { userId: 'u1', orderId: 'o1', type: 'start', code: 'order_closed', payload: { clientStartedAt: at } },
      { userId: 'u1', orderId: 'o1', type: 'start', code: 'order_closed' },
    ]);
    expect(status).toEqual({ kind: 'idle' });
  });

  describe('materials', () => {
    it('Q1: a materials item calls update_materials_notes and leaves the queue', async () => {
      const db = newDb();
      const { api, calls } = fakeApi();
      await enqueueMaterials(db, { userId: 'u1', orderId: 'o1', text: '2 cabos', expected: '1 cabo' });
      await enqueueMaterials(db, { userId: 'u1', orderId: 'o2', text: null, expected: null });

      await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

      expect(calls.map((c) => c.args[0])).toEqual([
        { p_order_id: 'o1', p_text: '2 cabos', p_expected: '1 cabo' },
        { p_order_id: 'o2' },
      ]);
      expect(await db.queue.count()).toBe(0);
    });

    it('Q1: an edit made while the item was in flight is sent next, against the text now on the server', async () => {
      const db = newDb();
      let first = true;
      const { api, calls } = fakeApi({
        updateMaterialsNotes: async (args: UpdateMaterialsNotesArgs) => {
          if (first) {
            first = false;
            await enqueueMaterials(db, { userId: 'u1', orderId: 'o1', text: '3 cabos', expected: '1 cabo' });
          }
          return { materials_notes: args.p_text ?? null };
        },
      });
      await enqueueMaterials(db, { userId: 'u1', orderId: 'o1', text: '2 cabos', expected: '1 cabo' });

      await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

      expect(calls.map((c) => c.args[0])).toEqual([
        { p_order_id: 'o1', p_text: '2 cabos', p_expected: '1 cabo' },
        { p_order_id: 'o1', p_text: '3 cabos', p_expected: '2 cabos' },
      ]);
      expect(await db.queue.count()).toBe(0);
    });

    it('Q6: a conflict drops the item and keeps the latest text with the one on the server', async () => {
      const db = newDb();
      const { api } = fakeApi({
        updateMaterialsNotes: async () => {
          await enqueueMaterials(db, { userId: 'u1', orderId: 'o1', text: '3 cabos', expected: '1 cabo' });
          throw new ApiError('rule', 'conflict', 'conflict', { current: 'cabo e conector' });
        },
      });
      await enqueueMaterials(db, { userId: 'u1', orderId: 'o1', text: '2 cabos', expected: '1 cabo' });

      const status = await processQueue({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' });

      expect(await db.queue.count()).toBe(0);
      expect(await db.refusals.toArray()).toMatchObject([
        {
          userId: 'u1',
          orderId: 'o1',
          type: 'materials',
          code: 'conflict',
          payload: { text: '3 cabos', expected: '1 cabo' },
          current: 'cabo e conector',
        },
      ]);
      expect(status).toEqual({ kind: 'idle' });
    });
  });
});
