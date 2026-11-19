// Uma passada da fila e o Background Sync (docs/queue.md, "Service worker"): o mesmo código na página e no worker.
import type { FastDb } from '../db';
import { processQueue, type QueueDeps, type QueueStatus } from './processor';

/** Tag do Background Sync que acorda o worker para enviar a fila. */
export const SYNC_TAG = 'fast-queue';
/** Canal em que o worker conta às páginas abertas o que a passada dele fez. */
export const QUEUE_CHANNEL = 'fast-queue';

export interface PassResult {
  status: QueueStatus;
  /** Algum item saiu da fila (aceito ou recusado). */
  sent: boolean;
  /** Alguma recusa por regra nova: a tela confere o vínculo (offline.md, proteção dos dados). */
  refused: boolean;
}

export type QueueMessage = { type: 'pass' } & PassResult;

async function counts(db: FastDb, userId: string) {
  const [queue, refusedDrafts, refusals] = await Promise.all([
    db.queue.where('userId').equals(userId).count(),
    db.drafts
      .where('userId')
      .equals(userId)
      .filter((d) => d.state === 'refused')
      .count(),
    db.refusals.where('userId').equals(userId).count(),
  ]);
  return { queue, refused: refusedDrafts + refusals };
}

/** Roda a fila (de novo enquanto `repeat` pedir) e compara o antes e o depois. */
export async function runPass(deps: QueueDeps, repeat: () => boolean = () => false): Promise<PassResult> {
  const before = await counts(deps.db, deps.userId);
  let status: QueueStatus;
  do status = await processQueue(deps);
  while (repeat());
  const after = await counts(deps.db, deps.userId);
  return { status, sent: after.queue < before.queue, refused: after.refused > before.refused };
}

export interface WorkerSyncDeps {
  /** O usuário da sessão guardada (a mesma da página); `null` sem login. */
  sessionUserId(): Promise<string | null>;
  /** Indício de conexão (Q7): o navegador só dispara o `sync` quando acha que há rede. */
  wake(userId: string): Promise<unknown>;
  pass(userId: string): Promise<PassResult>;
  post(message: QueueMessage): void;
}

/**
 * O evento `sync` do worker. É indício de conexão: o que espera por rede é tentado já, em vez de gastar a tentativa
 * do navegador. Com itens ainda esperando, falha de propósito: o navegador agenda outra tentativa (o worker não tem
 * timer que sobreviva). Sem login, termina: só a página entra de novo.
 */
export async function syncInWorker({ sessionUserId, wake, pass, post }: WorkerSyncDeps): Promise<void> {
  const userId = await sessionUserId();
  if (!userId) return;
  await wake(userId);
  const result = await pass(userId);
  post({ type: 'pass', ...result });
  if (result.status.kind === 'waiting') throw new Error('fila esperando a rede; o Background Sync tenta de novo');
}
