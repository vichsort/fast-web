// Dados do usuário no aparelho (docs/queue.md, Q10).
import type { FastDb, QueueRefusal } from '../db';

/**
 * Logout ou remoção do membro: apaga rascunhos, fotos, fila e recusas do usuário, numa transação. Seguro com o
 * processador no meio de um item: ele relê o item antes de gravar e não acha mais nada.
 */
export async function clearUser(db: FastDb, userId: string): Promise<void> {
  await db.transaction('rw', [db.drafts, db.photos, db.queue, db.refusals], async () => {
    await Promise.all(
      [db.drafts, db.photos, db.queue, db.refusals].map((table) => table.where('userId').equals(userId).delete()),
    );
  });
}

/** Itens do usuário ainda na fila, inclusive os bloqueados: o aviso antes do logout. */
export function pendingCount(db: FastDb, userId: string): Promise<number> {
  return db.queue.where('userId').equals(userId).count();
}

/** O técnico pede para tentar de novo um item bloqueado por bug (Q6): volta a ser tentado na vez dele. */
export async function retryBlocked(db: FastDb, id: number): Promise<void> {
  await db.queue
    .where('id')
    .equals(id)
    .filter((item) => item.state === 'blocked')
    .modify({ state: 'pending', attempts: 0, nextAttemptAt: 0, lastError: null });
}

/** Recusas por regra de `start` e `materials` do usuário, em ordem de chegada (a do envio fica no rascunho). */
export function listRefusals(db: FastDb, userId: string): Promise<QueueRefusal[]> {
  return db.refusals.where('userId').equals(userId).sortBy('id');
}

/** O técnico viu a recusa. */
export async function dismissRefusal(db: FastDb, id: number): Promise<void> {
  await db.refusals.delete(id);
}
