// O pedido de armazenamento persistente (docs/queue.md, Q12), feito uma vez ao abrir a interface do técnico.
import * as React from 'react';
import { ensurePersistentStorage, type StorageProtection } from '@/offline/persistence';

let protection: StorageProtection | null = null;
let asked = false;
const listeners = new Set<() => void>();

export function requestStorageProtection(): void {
  if (asked) return;
  asked = true;
  void ensurePersistentStorage().then((result) => {
    protection = result;
    for (const listener of listeners) listener();
  });
}

/** `null` enquanto o navegador não respondeu. */
export function useStorageProtection(): StorageProtection | null {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => protection,
  );
}
