// Processador da fila (docs/queue.md): escolhe o próximo item, executa e trata a resposta pela classe de erro.
import type { FastDb, MaterialsPayload, QueueItem, SubmitPayload } from '../db';
import type { Clock, QueueApi, QueueLock } from './api';
import { ApiError } from './errors';

/** Espera crescente (Q7): começa em 5 s, dobra a cada falha e para em 1 min. */
const FIRST_WAIT_MS = 5_000;
const MAX_WAIT_MS = 60_000;

export interface QueueDeps {
  db: FastDb;
  api: QueueApi;
  lock: QueueLock;
  clock: Clock;
  /** O usuário logado: só os itens dele são enviados (Q3). */
  userId: string;
}

export type QueueStatus = { kind: 'idle' } | { kind: 'waiting'; retryAt: number } | { kind: 'needs_login' };

export function processQueue(deps: QueueDeps): Promise<QueueStatus> {
  return deps.lock(() => run(deps));
}

async function run(input: QueueDeps): Promise<QueueStatus> {
  const deps = { ...input, api: resettingWaitsOnSuccess(input) };
  /** A sessão já foi renovada depois do último item aceito: outro erro de sessão é login vencido. */
  let renewed = false;
  for (;;) {
    const heads = await headsByOrder(deps);
    const now = deps.clock.now();
    const item = heads.find((i) => i.state === 'pending' && i.nextAttemptAt <= now);
    if (!item) return statusOf(heads);
    try {
      await execute(deps, item);
      renewed = false;
    } catch (error) {
      const failure = asApiError(error);
      switch (failure.errorClass) {
        case 'network':
        case 'server':
          await wait(deps, item, failure);
          break;
        case 'session': {
          if (renewed) return { kind: 'needs_login' };
          const renewal = await renewSession(deps);
          if (renewal === 'needs_login') return { kind: 'needs_login' };
          if (renewal instanceof ApiError) await wait(deps, item, renewal);
          else renewed = true;
          break;
        }
        case 'rule':
          await refuse(deps, item, failure);
          break;
        default:
          await block(deps, item, failure);
      }
    }
  }
}

/** Sessão (Q6): renova e o item é tentado de novo; sem renovação, a fila inteira para e pede login. */
async function renewSession({ api }: QueueDeps): Promise<'renewed' | 'needs_login' | ApiError> {
  try {
    return (await api.refreshSession()) ? 'renewed' : 'needs_login';
  } catch (error) {
    const failure = asApiError(error);
    return failure.errorClass === 'network' || failure.errorClass === 'server' ? failure : 'needs_login';
  }
}

/**
 * Q7: "online" é um request que deu certo. Cada sucesso zera a espera dos itens do usuário que esperavam por rede
 * ou servidor, que voltam a ser tentados nesta mesma passada.
 */
function resettingWaitsOnSuccess({ db, api, userId }: QueueDeps): QueueApi {
  const wrapped = {} as Record<string, unknown>;
  for (const [method, fn] of Object.entries(api) as [keyof QueueApi, (...args: unknown[]) => Promise<unknown>][]) {
    wrapped[method] = async (...args: unknown[]) => {
      const result = await fn.apply(api, args);
      if (method !== 'refreshSession') {
        await db.queue
          .where('userId')
          .equals(userId)
          .filter((i) => i.state === 'pending' && i.attempts > 0)
          .modify({ attempts: 0, nextAttemptAt: 0, waitingFor: null, lastError: null });
      }
      return result;
    };
  }
  return wrapped as unknown as QueueApi;
}

/**
 * Q7: indício de conexão (o evento `online`, o `sync` do Background Sync, uma resposta HTTP do Supabase na página).
 * As esperas por rede do usuário vencem já, sem zerar a contagem: se o indício enganar, a próxima falha espera mais.
 * A espera por servidor (5xx, 429) continua: o indício não diz nada dele. Devolve quantos itens venceram.
 */
export function wakeNetworkWaits(db: FastDb, userId: string): Promise<number> {
  return db.queue
    .where('userId')
    .equals(userId)
    .filter((i) => i.state === 'pending' && i.waitingFor === 'network' && i.nextAttemptAt > 0)
    .modify({ nextAttemptAt: 0 });
}

/** Q2: de cada O.S., só o item mais antigo do usuário (Q3) pode ser tentado. Em ordem de chegada. */
async function headsByOrder({ db, userId }: QueueDeps): Promise<QueueItem[]> {
  const heads = new Map<string, QueueItem>();
  for (const item of await db.queue.where('userId').equals(userId).sortBy('id')) {
    if (!heads.has(item.orderId)) heads.set(item.orderId, item);
  }
  return [...heads.values()];
}

function statusOf(heads: QueueItem[]): QueueStatus {
  const waiting = heads.filter((i) => i.state === 'pending').map((i) => i.nextAttemptAt);
  return waiting.length ? { kind: 'waiting', retryAt: Math.min(...waiting) } : { kind: 'idle' };
}

/** Qualquer exceção que não veio classificada da API é bug. */
function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError('bug', null, error instanceof Error ? `${error.name}: ${error.message}` : String(error));
}

/**
 * Regra (Q6): o item sai da fila e o motivo fica para a tela. Lê o item de novo na transação: a tela pode ter
 * trocado o texto de materiais enquanto a chamada estava no ar.
 */
async function refuse({ db, clock }: QueueDeps, item: QueueItem, failure: ApiError): Promise<void> {
  const id = item.id as number;
  const refusal = {
    userId: item.userId,
    orderId: item.orderId,
    code: failure.code ?? failure.message,
    createdAt: new Date(clock.now()).toISOString(),
  };
  await db.transaction('rw', [db.queue, db.refusals, db.drafts], async () => {
    const current = await db.queue.get(id);
    if (!current) return;
    await db.queue.delete(id);
    switch (current.type) {
      case 'start':
        await db.refusals.add({ ...refusal, type: 'start', payload: current.payload, current: null });
        return;
      case 'materials': {
        const details = failure.details as { current?: unknown } | null;
        const serverText = typeof details?.current === 'string' ? details.current : null;
        await db.refusals.add({ ...refusal, type: 'materials', payload: current.payload, current: serverText });
        return;
      }
      case 'submit':
        await db.drafts.update(current.payload.draftId, { state: 'refused', refusal: refusal.code });
        return;
    }
  });
}

/** Bug: o item para com o erro até o técnico pedir de novo; nunca é descartado (Q6). */
async function block({ db }: QueueDeps, item: QueueItem, failure: ApiError): Promise<void> {
  await db.queue.update(item.id as number, { state: 'blocked', lastError: failure.message });
}

/**
 * Rede ou servidor: o item fica e espera mais a cada falha, só naquela O.S. (Q6, Q7). Conta a partir do que está
 * gravado: um passo aceito no meio do item já zerou a espera.
 */
async function wait({ db, clock }: QueueDeps, item: QueueItem, failure: ApiError): Promise<void> {
  const id = item.id as number;
  await db.queue
    .where('id')
    .equals(id)
    .modify((current) => {
      current.nextAttemptAt = clock.now() + Math.min(FIRST_WAIT_MS * 2 ** current.attempts, MAX_WAIT_MS);
      current.attempts += 1;
      current.waitingFor = failure.errorClass === 'server' ? 'server' : 'network';
      current.lastError = failure.message;
    });
}

async function execute(deps: QueueDeps, item: QueueItem): Promise<void> {
  const id = item.id as number;
  switch (item.type) {
    case 'start':
      await deps.api.startExecution({ p_order_id: item.orderId, p_client_started_at: item.payload.clientStartedAt });
      await deps.db.queue.delete(id);
      return;
    case 'materials':
      await sendMaterials(deps, id, item.orderId, item.payload);
      return;
    case 'submit':
      await sendSubmit(deps, id, item.payload);
      return;
  }
}

/**
 * Envio (Q4): cada foto ainda não enviada passa por pedir a URL, PUT e confirmar, uma por vez; com todas
 * enviadas, `submit_execution`; aceito, o rascunho, as fotos e o item saem juntos. Cada passo fica gravado
 * (`uploaded` na foto, `stagedPhotoIds` no item) para a próxima tentativa continuar dali.
 */
async function sendSubmit({ db, api }: QueueDeps, id: number, payload: SubmitPayload): Promise<void> {
  const draft = await db.drafts.get(payload.draftId);
  if (!draft) throw new Error(`draft ${payload.draftId} of queue item ${id} is gone`);
  const photos = await db.photos.where('draftId').equals(draft.id).sortBy('createdAt');

  for (const photo of photos) {
    if (photo.uploaded) continue;
    const ref = { order_id: draft.orderId, execution_id: draft.id, photo_id: photo.id };
    let staged = payload.stagedPhotoIds.includes(photo.id);
    if (staged) {
      try {
        await api.confirmPhotoUpload(ref);
      } catch (error) {
        // O staging expira (04, R18): o PUT de uma tentativa antiga pode não estar mais lá. Envia de novo.
        if (!(error instanceof ApiError && error.code === 'photo_missing_in_storage')) throw error;
        await setStaged(db, id, photo.id, false);
        staged = false;
      }
    }
    if (!staged) {
      const upload = await api.requestPhotoUpload(ref);
      if (!upload.already_uploaded) {
        if (!upload.upload_url) throw new Error(`request_photo_upload gave no url for photo ${photo.id}`);
        await api.uploadPhoto(upload.upload_url, photo.blob);
        await setStaged(db, id, photo.id, true);
        await api.confirmPhotoUpload(ref);
      }
    }
    await db.transaction('rw', db.photos, db.queue, async () => {
      await db.photos.update(photo.id, { uploaded: true });
      await setStaged(db, id, photo.id, false);
    });
  }

  await api.submitExecution({
    p_execution_id: draft.id,
    p_order_id: draft.orderId,
    p_supplements_execution_id: draft.supplementsExecutionId ?? undefined,
    p_description: draft.description || undefined,
    p_participants: draft.participants,
    p_client_started_at: draft.clientStartedAt ?? undefined,
    p_client_submitted_at: payload.clientSubmittedAt,
    p_photos: photos.map((p) => ({
      id: p.id,
      source: p.source,
      captured_at: p.capturedAt,
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy_m: p.accuracyM,
      width: p.width,
      height: p.height,
    })),
  });
  await db.transaction('rw', [db.drafts, db.photos, db.queue], async () => {
    await db.photos.where('draftId').equals(draft.id).delete();
    await db.drafts.delete(draft.id);
    await db.queue.delete(id);
  });
}

/** Marca (ou desmarca) a foto como já enviada ao staging, à espera da confirmação. */
async function setStaged(db: FastDb, id: number, photoId: string, staged: boolean): Promise<void> {
  await db.queue
    .where('id')
    .equals(id)
    .modify((item) => {
      if (item.type !== 'submit') return;
      const others = item.payload.stagedPhotoIds.filter((p) => p !== photoId);
      item.payload.stagedPhotoIds = staged ? [...others, photoId] : others;
    });
}

/**
 * Materiais (03). Aceito: o item sai, a menos que a tela tenha trocado o texto enquanto a chamada estava no ar;
 * aí o item fica, com o texto que o servidor acabou de gravar como o `expected` da próxima tentativa.
 */
async function sendMaterials(
  { db, api }: QueueDeps,
  id: number,
  orderId: string,
  sent: MaterialsPayload,
): Promise<void> {
  const saved = await api.updateMaterialsNotes({
    p_order_id: orderId,
    p_text: sent.text ?? undefined,
    p_expected: sent.expected ?? undefined,
  });
  await db.transaction('rw', db.queue, async () => {
    const current = await db.queue.get(id);
    if (current?.type !== 'materials') return;
    if (current.payload.text === sent.text) await db.queue.delete(id);
    else await db.queue.update(id, { payload: { text: current.payload.text, expected: saved.materials_notes } });
  });
}
