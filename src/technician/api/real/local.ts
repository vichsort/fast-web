// O que o aparelho guarda do técnico logado (Dexie), lido ao vivo (`liveQuery`) para as telas acompanharem a fila.
// Uma assinatura por usuário; as telas leem pelo `useLocal`.
import { liveQuery, type Subscription } from 'dexie';
import * as React from 'react';
import type { PhotoData } from '@/components/photos';
import { type DraftPhoto, db } from '@/offline/db';
import type { LocalState } from '../../derive';

let userId: string | null = null;
let snapshot: (LocalState & { photoRows: DraftPhoto[] }) | null = null;
let subscription: Subscription | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Começa (ou troca) a leitura ao vivo do usuário. */
export function watchLocal(next: string) {
  if (userId === next && subscription) return;
  subscription?.unsubscribe();
  userId = next;
  snapshot = null;
  subscription = liveQuery(async () => {
    const [drafts, photoRows, queue, refusals, seen] = await Promise.all([
      db.drafts.where('userId').equals(next).toArray(),
      db.photos.where('userId').equals(next).toArray(),
      db.queue.where('userId').equals(next).toArray(),
      db.refusals.where('userId').equals(next).toArray(),
      db.seen.where('userId').equals(next).toArray(),
    ]);
    return { drafts, photoRows, queue, refusals, seen };
  }).subscribe({
    next: ({ drafts, photoRows, queue, refusals, seen }) => {
      snapshot = {
        userId: next,
        drafts,
        photos: photoRows,
        photoRows,
        queue,
        refusals,
        seen: new Set(seen.map((s) => s.orderId)),
      };
      releaseUrls(new Set(photoRows.map((p) => p.id)));
      emit();
    },
    error: (error) => console.error('leitura do banco local falhou', error),
  });
}

export function stopLocal() {
  subscription?.unsubscribe();
  subscription = null;
  userId = null;
  snapshot = null;
  releaseUrls(new Set());
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Estado local do usuário; `undefined` até a primeira leitura do IndexedDB. */
export function useLocal() {
  return React.useSyncExternalStore(subscribe, () => snapshot ?? undefined);
}

export function localSnapshot() {
  return snapshot;
}

// ---------------------------------------------------------------- fotos do rascunho

/** URL de objeto por foto local: criada uma vez e revogada quando a foto sai do aparelho. */
const urls = new Map<string, string>();

function releaseUrls(keep: Set<string>) {
  for (const [id, url] of urls) {
    if (!keep.has(id)) {
      URL.revokeObjectURL(url);
      urls.delete(id);
    }
  }
}

export function photoData(row: DraftPhoto): PhotoData {
  let url = urls.get(row.id);
  if (!url) {
    url = URL.createObjectURL(row.blob);
    urls.set(row.id, url);
  }
  return {
    id: row.id,
    url,
    source: row.source,
    captured_at: row.capturedAt,
    accuracy_m: row.accuracyM,
    latitude: row.latitude,
    alerts: [],
  };
}

/** Chave do rascunho (draftKey) → O.S. e tentativa somada (`null` = tentativa nova). */
export function parseDraftKey(key: string): { orderId: string; attemptId: string | null } {
  const [kind, orderId = '', attemptId = null] = key.split(':');
  return { orderId, attemptId: kind === 'supplement' ? attemptId : null };
}
