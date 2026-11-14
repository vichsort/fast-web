// Processador da fila (docs/queue.md): escolhe o próximo item, executa e trata a resposta pela classe de erro.
import type { FastDb, QueueItem } from '../db';
import type { Clock, QueueApi, QueueLock } from './api';
import { ApiError } from './errors';

/** Espera crescente (Q7): começa em 5 s, dobra a cada falha e para em 5 min. */
const FIRST_WAIT_MS = 5_000;
const MAX_WAIT_MS = 5 * 60_000;

export interface QueueDeps {
  db: FastDb;
  api: QueueApi;
  lock: QueueLock;
  clock: Clock;
  /** O usuário logado: só os itens dele são enviados (Q3). */
  userId: string;
}

export type QueueStatus = { kind: 'idle' } | { kind: 'waiting'; retryAt: number } | { kind: 'needs_login' };

export function processQueue(deps: QueueDeps): Promise<QueueStatus> {
  return deps.lock(() => run(deps));
}

async function run(input: QueueDeps): Promise<QueueStatus> {
  const deps = { ...input, api: resettingWaitsOnSuccess(input) };
  for (;;) {
    const heads = await headsByOrder(deps);
    const now = deps.clock.now();
    const item = heads.find((i) => i.state === 'pending' && i.nextAttemptAt <= now);
    if (!item) return statusOf(heads);
    try {
      await execute(deps, item);
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError('bug', null, String(error));
      await wait(deps, item, failure);
    }
  }
}

/**
 * Q7: "online" é um request que deu certo. Cada sucesso zera a espera dos itens do usuário que esperavam por rede
 * ou servidor, que voltam a ser tentados nesta mesma passada.
 */
function resettingWaitsOnSuccess({ db, api, userId }: QueueDeps): QueueApi {
  const wrapped = {} as Record<string, unknown>;
  for (const [method, fn] of Object.entries(api) as [keyof QueueApi, (...args: unknown[]) => Promise<unknown>][]) {
    wrapped[method] = async (...args: unknown[]) => {
      const result = await fn.apply(api, args);
      if (method !== 'refreshSession') {
        await db.queue
          .where('userId')
          .equals(userId)
          .filter((i) => i.state === 'pending' && i.attempts > 0)
          .modify({ attempts: 0, nextAttemptAt: 0, lastError: null });
      }
      return result;
    };
  }
  return wrapped as unknown as QueueApi;
}

/** Q2: de cada O.S., só o item mais antigo do usuário (Q3) pode ser tentado. Em ordem de chegada. */
async function headsByOrder({ db, userId }: QueueDeps): Promise<QueueItem[]> {
  const heads = new Map<string, QueueItem>();
  for (const item of await db.queue.where('userId').equals(userId).sortBy('id')) {
    if (!heads.has(item.orderId)) heads.set(item.orderId, item);
  }
  return [...heads.values()];
}

function statusOf(heads: QueueItem[]): QueueStatus {
  const waiting = heads.filter((i) => i.state === 'pending').map((i) => i.nextAttemptAt);
  return waiting.length ? { kind: 'waiting', retryAt: Math.min(...waiting) } : { kind: 'idle' };
}

/** Rede ou servidor: o item fica e espera mais a cada falha, só naquela O.S. (Q6, Q7). */
async function wait({ db, clock }: QueueDeps, item: QueueItem, failure: ApiError): Promise<void> {
  const delay = Math.min(FIRST_WAIT_MS * 2 ** item.attempts, MAX_WAIT_MS);
  await db.queue.update(item.id as number, {
    attempts: item.attempts + 1,
    nextAttemptAt: clock.now() + delay,
    lastError: failure.message,
  });
}

async function execute({ db, api }: QueueDeps, item: QueueItem): Promise<void> {
  const id = item.id as number;
  switch (item.type) {
    case 'start':
      await api.startExecution({ p_order_id: item.orderId, p_client_started_at: item.payload.clientStartedAt });
      await db.queue.delete(id);
      return;
    default:
      throw new Error(`not implemented: ${item.type}`);
  }
}
