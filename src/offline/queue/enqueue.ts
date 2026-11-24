// Entrada na fila (docs/queue.md, Q1): o que a tela chama quando o técnico age.
import { type FastDb, type OrderSnapshot, QUEUE_ITEM_FORMAT, type QueueItem } from '../db';

type Fresh = Pick<
  QueueItem,
  'format' | 'state' | 'attempts' | 'nextAttemptAt' | 'waitingFor' | 'lastError' | 'createdAt'
>;

function fresh(): Fresh {
  return {
    format: QUEUE_ITEM_FORMAT,
    state: 'pending',
    attempts: 0,
    nextAttemptAt: 0,
    waitingFor: null,
    lastError: null,
    createdAt: new Date().toISOString(),
  };
}

/** Iniciar (04, R1): `clientStartedAt` é o relógio do aparelho no toque. */
export async function enqueueStart(
  db: FastDb,
  item: { userId: string; orderId: string; clientStartedAt: string; order?: OrderSnapshot },
): Promise<void> {
  await db.queue.add({
    userId: item.userId,
    orderId: item.orderId,
    type: 'start',
    payload: { clientStartedAt: item.clientStartedAt },
    order: item.order,
    ...fresh(),
  });
}

/**
 * Enviar (Q4, Q5): o rascunho sai de `editing` para `queued` e entra na fila, numa transação. Repetir o toque
 * com o rascunho já na fila não faz nada. Rascunho de outro usuário, recusado ou inexistente é erro da tela.
 */
export async function enqueueSubmit(
  db: FastDb,
  item: { userId: string; draftId: string; clientSubmittedAt: string; order?: OrderSnapshot },
): Promise<void> {
  await db.transaction('rw', db.drafts, db.queue, async () => {
    const draft = await db.drafts.get(item.draftId);
    if (!draft || draft.userId !== item.userId) throw new Error(`draft ${item.draftId} not found for this user`);
    if (draft.state === 'queued') return;
    if (draft.state !== 'editing') throw new Error(`draft ${item.draftId} is ${draft.state}`);
    await db.drafts.update(draft.id, { state: 'queued', order: item.order, updatedAt: new Date().toISOString() });
    await db.queue.add({
      userId: draft.userId,
      orderId: draft.orderId,
      type: 'submit',
      payload: { draftId: draft.id, clientSubmittedAt: item.clientSubmittedAt, stagedPhotoIds: [] },
      order: item.order,
      ...fresh(),
    });
  });
}

/**
 * Editar materiais (03, "Offline e mobile"): só a última edição por O.S. Se já há um item de materiais do usuário
 * nessa O.S., troca o texto no lugar e mantém o `expected` dele, o texto do servidor de onde a edição partiu.
 */
export async function enqueueMaterials(
  db: FastDb,
  item: { userId: string; orderId: string; text: string | null; expected: string | null; order?: OrderSnapshot },
): Promise<void> {
  await db.transaction('rw', db.queue, async () => {
    const queued = await db.queue
      .where('[userId+orderId]')
      .equals([item.userId, item.orderId])
      .filter((i) => i.type === 'materials')
      .first();
    if (queued?.type === 'materials') {
      await db.queue.update(queued.id as number, {
        payload: { ...queued.payload, text: item.text },
        order: item.order ?? queued.order,
      });
      return;
    }
    await db.queue.add({
      userId: item.userId,
      orderId: item.orderId,
      type: 'materials',
      payload: { text: item.text, expected: item.expected },
      order: item.order,
      ...fresh(),
    });
  });
}
