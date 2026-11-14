// Dados do usuário no aparelho (docs/queue.md, Q10).
import type { FastDb } from '../db';

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
