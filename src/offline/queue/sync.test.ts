import { enqueueStart } from './enqueue';
import { ApiError } from './errors';
import type { QueueStatus } from './processor';
import { type PassResult, runPass, syncInWorker } from './sync';
import { fakeApi, fakeClock, newDb, noLock } from './testing';

const at = '2026-11-13T10:00:00.000Z';

describe('runPass', () => {
  it('says whether something left the queue and whether something was refused', async () => {
    const db = newDb();
    const { api } = fakeApi({
      startExecution: async (args) => {
        if (args.p_order_id === 'o2') throw new ApiError('rule', 'already_started', 'already_started');
      },
    });
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    const deps = { db, api, lock: noLock, clock: fakeClock(), userId: 'u1' };

    expect(await runPass(deps)).toEqual({ status: { kind: 'idle' }, sent: true, refused: false });

    await enqueueStart(db, { userId: 'u1', orderId: 'o2', clientStartedAt: at });
    expect(await runPass(deps)).toEqual({ status: { kind: 'idle' }, sent: true, refused: true });
    expect(await runPass(deps)).toEqual({ status: { kind: 'idle' }, sent: false, refused: false });
  });

  it('runs the queue again while `repeat` asks (an item queued in the middle of the pass)', async () => {
    const db = newDb();
    const { api, calls } = fakeApi();
    await enqueueStart(db, { userId: 'u1', orderId: 'o1', clientStartedAt: at });
    let again = true;
    const repeat = () => {
      if (!again) return false;
      again = false;
      void enqueueStart(db, { userId: 'u1', orderId: 'o2', clientStartedAt: at });
      return true;
    };

    await runPass({ db, api, lock: noLock, clock: fakeClock(), userId: 'u1' }, repeat);

    expect(calls.map((c) => c.method)).toEqual(['startExecution', 'startExecution']);
    expect(await db.queue.count()).toBe(0);
  });
});

describe('syncInWorker', () => {
  const result = (status: QueueStatus): PassResult => ({ status, sent: true, refused: false });

  it('Q3: without a stored session it does nothing', async () => {
    const pass = vi.fn();
    const post = vi.fn();

    await syncInWorker({ sessionUserId: async () => null, pass, post });

    expect(pass).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('Q3: sends the items of the stored session user and tells the open pages', async () => {
    const pass = vi.fn(async () => result({ kind: 'idle' }));
    const post = vi.fn();

    await syncInWorker({ sessionUserId: async () => 'u1', pass, post });

    expect(pass).toHaveBeenCalledWith('u1');
    expect(post).toHaveBeenCalledWith({ type: 'pass', ...result({ kind: 'idle' }) });
  });

  it('fails the sync event while items wait for the network, so the browser tries again later', async () => {
    const post = vi.fn();
    const waiting = result({ kind: 'waiting', retryAt: 5_000 });

    await expect(syncInWorker({ sessionUserId: async () => 'u1', pass: async () => waiting, post })).rejects.toThrow();
    expect(post).toHaveBeenCalledWith({ type: 'pass', ...waiting });
  });

  it('a lost login ends the sync event: only the page can sign in again', async () => {
    const pass = async () => result({ kind: 'needs_login' });

    await expect(syncInWorker({ sessionUserId: async () => 'u1', pass, post: vi.fn() })).resolves.toBeUndefined();
  });
});
