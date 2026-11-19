// Processador da fila na página (docs/queue.md): roda sob o lock `fast-queue` (o service worker usa o mesmo), quando
// a tela põe algo na fila, quando a rede ou o app voltam e no horário que a fila pediu para tentar de novo. Cada ação
// que põe na fila também registra o Background Sync, que envia pelo worker com o app fechado.
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/offline/db';
import {
  createSupabaseQueueApi,
  type PassResult,
  QUEUE_CHANNEL,
  type QueueMessage,
  type QueueStatus,
  runPass,
  SYNC_TAG,
  wakeNetworkWaits,
  webLock,
} from '@/offline/queue';
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
  let result: PassResult = { status: { kind: 'idle' }, sent: false, refused: false };
  again = false;
  try {
    result = await runPass({ db, api, lock, clock, userId: context.userId }, () => {
      const repeat = again;
      again = false;
      return repeat;
    });
  } catch (error) {
    console.error('fila parou', error);
    result = { ...result, status: { kind: 'waiting', retryAt: Date.now() + 30_000 } };
  }
  set({ running: false });
  applyPass(result);
}

/** Resultado de uma passada, da página ou do worker: estado do indicador, próxima tentativa e os avisos. */
function applyPass({ status, sent, refused }: PassResult) {
  set({
    status,
    online: status.kind !== 'waiting',
    lastSyncAt: sent ? new Date().toISOString() : state.lastSyncAt,
  });
  if (timer) clearTimeout(timer);
  timer = null;
  if (status.kind === 'waiting') {
    timer = setTimeout(() => void kick(), Math.max(1_000, status.retryAt - Date.now()));
  }
  for (const listener of afterRun) listener({ sent, refused });
}

/**
 * Indício de conexão (Q7): o evento `online` ou uma resposta do Supabase. As esperas por rede vencem e, se alguma
 * venceu, a fila roda. Diz se acordou a fila.
 */
export async function hintConnectivity(): Promise<boolean> {
  const context = currentOrNull();
  if (!context) return false;
  if ((await wakeNetworkWaits(db, context.userId)) === 0) return false;
  void kick();
  return true;
}

/** A tela pôs algo na fila: tenta já e deixa o Background Sync de reserva (sinal que volta com o app fechado). */
export function queued() {
  void kick();
  void requestSync();
}

async function requestSync() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    await (registration as { sync?: { register(tag: string): Promise<void> } } | undefined)?.sync?.register(SYNC_TAG);
  } catch (error) {
    // Sem permissão ou sem suporte: a página continua enviando sozinha.
    console.warn('background sync indisponível', error);
  }
}

/** Ouve as passadas do worker enquanto a página está aberta. */
export function listenToWorker(): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(QUEUE_CHANNEL);
  channel.onmessage = (event: MessageEvent<QueueMessage>) => {
    if (event.data?.type !== 'pass') return;
    const { sent, refused } = event.data;
    // Com a página no meio de uma passada, o estado sai dela; os avisos (recarregar, conferir o vínculo) valem já.
    if (state.running) for (const listener of afterRun) listener({ sent, refused });
    else applyPass(event.data);
  };
  return () => channel.close();
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
