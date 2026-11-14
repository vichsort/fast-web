// Lock do processador (docs/queue.md, Q9): Web Locks API, que vale entre a página e o service worker da mesma
// origem. `navigator.locks` existe nos dois (e no Node, nos testes).
import type { QueueLock } from './api';

export const QUEUE_LOCK_NAME = 'fast-queue';

/** Espera o lock `fast-queue` e roda `fn` com ele; quem chega depois roda em seguida e acha a fila já andada. */
export function webLock(name = QUEUE_LOCK_NAME): QueueLock {
  return (fn) => navigator.locks.request(name, fn);
}
