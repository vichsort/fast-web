// Entrada na fila (docs/queue.md, Q1): o que a tela chama quando o técnico age.
import type { FastDb, QueueItem } from '../db';

type Fresh = Pick<QueueItem, 'state' | 'attempts' | 'nextAttemptAt' | 'lastError' | 'createdAt'>;

function fresh(): Fresh {
  return { state: 'pending', attempts: 0, nextAttemptAt: 0, lastError: null, createdAt: new Date().toISOString() };
}

/** Iniciar (04, R1): `clientStartedAt` é o relógio do aparelho no toque. */
export async function enqueueStart(
  db: FastDb,
  item: { userId: string; orderId: string; clientStartedAt: string },
): Promise<void> {
  await db.queue.add({
    userId: item.userId,
    orderId: item.orderId,
    type: 'start',
    payload: { clientStartedAt: item.clientStartedAt },
    ...fresh(),
  });
}
