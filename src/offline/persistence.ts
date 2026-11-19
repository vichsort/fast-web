// Armazenamento persistente (docs/queue.md, Q12): sem ele, o Chrome pode apagar o IndexedDB inteiro (rascunhos,
// fotos e fila, a prova ainda não enviada) quando falta espaço no aparelho.

export type StorageProtection = 'persisted' | 'denied' | 'unsupported';

type StorageApi = Pick<StorageManager, 'persisted' | 'persist'>;

const browserStorage: StorageApi | null = typeof navigator !== 'undefined' ? (navigator.storage ?? null) : null;

/** Pede ao navegador para não apagar o armazenamento do app; só pede se ainda não tem. */
export async function ensurePersistentStorage(storage: StorageApi | null = browserStorage): Promise<StorageProtection> {
  if (typeof storage?.persist !== 'function' || typeof storage.persisted !== 'function') return 'unsupported';
  try {
    if (await storage.persisted()) return 'persisted';
    return (await storage.persist()) ? 'persisted' : 'denied';
  } catch {
    return 'denied';
  }
}
