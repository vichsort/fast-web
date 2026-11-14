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

/**
 * Enviar (Q4, Q5): o rascunho sai de `editing` para `queued` e entra na fila, numa transação. Repetir o toque
 * com o rascunho já na fila não faz nada. Rascunho de outro usuário, recusado ou inexistente é erro da tela.
 */
export async function enqueueSubmit(
  db: FastDb,
  item: { userId: string; draftId: string; clientSubmittedAt: string },
): Promise<void> {
  await db.transaction('rw', db.drafts, db.queue, async () => {
    const draft = await db.drafts.get(item.draftId);
    if (!draft || draft.userId !== item.userId) throw new Error(`draft ${item.draftId} not found for this user`);
    if (draft.state === 'queued') return;
    if (draft.state !== 'editing') throw new Error(`draft ${item.draftId} is ${draft.state}`);
    await db.drafts.update(draft.id, { state: 'queued', updatedAt: new Date().toISOString() });
    await db.queue.add({
      userId: draft.userId,
      orderId: draft.orderId,
      type: 'submit',
      payload: { draftId: draft.id, clientSubmittedAt: item.clientSubmittedAt, stagedPhotoIds: [] },
      ...fresh(),
    });
  });
}
