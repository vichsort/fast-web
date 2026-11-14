// Processador da fila (docs/queue.md): escolhe o próximo item, executa e trata a resposta pela classe de erro.
import type { FastDb, QueueItem } from '../db';
import type { Clock, QueueApi, QueueLock } from './api';

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

async function run(deps: QueueDeps): Promise<QueueStatus> {
  for (;;) {
    const item = await nextReady(deps);
    if (!item) return { kind: 'idle' };
    await execute(deps, item);
  }
}

async function nextReady({ db, userId }: QueueDeps): Promise<QueueItem | undefined> {
  const items = await db.queue.where('userId').equals(userId).sortBy('id');
  return items[0];
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
