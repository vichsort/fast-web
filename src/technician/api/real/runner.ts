// Processador da fila na página (docs/queue.md): roda sob o lock `fast-queue` (o service worker usa o mesmo), quando
// a tela põe algo na fila, quando a rede ou o app voltam e no horário que a fila pediu para tentar de novo.
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/offline/db';
import { createSupabaseQueueApi, processQueue, type QueueStatus, webLock } from '@/offline/queue';
import { currentOrNull } from './context';

export interface RunnerState {
  running: boolean;
  status: QueueStatus | null;
  /** "Online" é o último request que deu certo (Q7): a fila esperando por rede conta como sem sinal. */
  online: boolean;
  /** Fim da última passada que mandou algo. */
  lastSyncAt: string | null;
}

let state: RunnerState = { running: false, status: null, online: true, lastSyncAt: null };
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
/** Avisos depois de cada passada (recarregar leituras, conferir o vínculo). */
const afterRun = new Set<(changed: { sent: boolean; refused: boolean }) => void>();

function set(patch: Partial<RunnerState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

const api = createSupabaseQueueApi(supabase);
const lock = webLock();
const clock = { now: () => Date.now() };

async function counts(userId: string) {
  const [queue, refused, refusals] = await Promise.all([
    db.queue.where('userId').equals(userId).count(),
    db.drafts
      .where('userId')
      .equals(userId)
      .filter((d) => d.state === 'refused')
      .count(),
    db.refusals.where('userId').equals(userId).count(),
  ]);
  return { queue, refused: refused + refusals };
}

/** Acorda a fila. Se já está rodando, roda de novo no fim (a tela pode ter posto um item no meio). */
export async function kick(): Promise<void> {
  const context = currentOrNull();
  if (!context) return;
  if (state.running) {
    again = true;
    return;
  }
  if (timer) clearTimeout(timer);
  timer = null;
  set({ running: true });
  const before = await counts(context.userId);
  let status: QueueStatus = { kind: 'idle' };
  try {
    do {
      again = false;
      status = await processQueue({ db, api, lock, clock, userId: context.userId });
    } while (again);
  } catch (error) {
    console.error('fila parou', error);
    status = { kind: 'waiting', retryAt: Date.now() + 30_000 };
  }
  const after = await counts(context.userId);
  const sent = after.queue < before.queue;
  set({
    running: false,
    status,
    online: status.kind !== 'waiting',
    lastSyncAt: sent ? new Date().toISOString() : state.lastSyncAt,
  });
  if (status.kind === 'waiting') {
    timer = setTimeout(() => void kick(), Math.max(1_000, status.retryAt - Date.now()));
  }
  for (const listener of afterRun) listener({ sent, refused: after.refused > before.refused });
}

export function onAfterRun(listener: (changed: { sent: boolean; refused: boolean }) => void) {
  afterRun.add(listener);
  return () => afterRun.delete(listener);
}

export function stopRunner() {
  if (timer) clearTimeout(timer);
  timer = null;
  state = { running: false, status: null, online: true, lastSyncAt: null };
}

/** Uma leitura que deu certo também prova que há sinal (Q7). */
export function markOnline(online: boolean) {
  if (state.online !== online) set({ online });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useRunner(): RunnerState {
  return React.useSyncExternalStore(subscribe, () => state);
}
