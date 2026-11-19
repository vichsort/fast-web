// Funções puras do técnico: juntam o que veio do servidor com o que está no aparelho (rascunhos, fila e recusas
// no Dexie) no formato que as telas leem (docs/screens-technician.md, queue.md).
import type { PhotoData } from '@/components/photos';
import type { OrderDetail, PendingItem } from '@/lib/views';
import { isOverdue } from '@/office/derive';
import type { Draft, DraftPhoto, QueueItem, QueueRefusal } from '@/offline/db';
import { photoAlerts } from '@/photos/alerts';
import type { MyOrder, ParticipantOption, TechOrder } from './api/types';

/** O que o aparelho guarda do usuário logado. */
export interface LocalState {
  userId: string;
  drafts: Draft[];
  photos: Pick<DraftPhoto, 'id' | 'draftId' | 'uploaded'>[];
  queue: QueueItem[];
  refusals: QueueRefusal[];
  /** O.S. já abertas neste aparelho. */
  seen: Set<string>;
}

/** Hora do início guardada no aparelho: o rascunho da tentativa ou, sem ele, o "iniciar" ainda na fila. */
function startedHere(orderId: string, local: LocalState): string | null {
  const attempt = local.drafts.find(
    (d) => d.orderId === orderId && d.supplementsExecutionId === null && d.state !== 'refused',
  );
  if (attempt?.clientStartedAt) return attempt.clientStartedAt;
  const start = local.queue.find((i) => i.orderId === orderId && i.type === 'start');
  return start?.type === 'start' ? start.payload.clientStartedAt : null;
}

/** Status com o efeito local: iniciada no aparelho (04, R1) conta como em execução até o servidor confirmar. */
function localStatus(order: Pick<OrderDetail, 'id' | 'status'>, local: LocalState): OrderDetail['status'] {
  if ((order.status === 'open' || order.status === 'rejected') && startedHere(order.id, local)) return 'in_progress';
  return order.status;
}

/** Quem pode constar como participante (04, R6): atribuído agora ou antes; quem envia primeiro. */
function participantOptions(order: OrderDetail, userId: string): ParticipantOption[] {
  const options = new Map<string, ParticipantOption>();
  for (const a of order.assignments) {
    const prev = options.get(a.user_id);
    options.set(a.user_id, {
      ...a.user,
      active: Boolean(prev?.active) || a.unassigned_at === null,
      isSelf: a.user_id === userId,
    });
  }
  return [...options.values()].sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
}

export function toTechOrder(order: OrderDetail, local: LocalState, now: number): TechOrder {
  const status = localStatus(order, local);
  const materials = local.queue.find((i) => i.orderId === order.id && i.type === 'materials');
  const conflict = local.refusals.find(
    (r) => r.orderId === order.id && r.type === 'materials' && r.code === 'conflict',
  );
  return {
    ...order,
    status,
    overdue: isOverdue({ due_at: order.due_at, status }, now),
    materials_notes: materials?.type === 'materials' ? materials.payload.text : order.materials_notes,
    startedHere: startedHere(order.id, local),
    participantOptions: participantOptions(order, local.userId),
    conflict:
      conflict?.type === 'materials' ? { mine: conflict.payload.text ?? '', current: conflict.current ?? '' } : null,
  };
}

export function toMyOrder(order: OrderDetail, local: LocalState, now: number): MyOrder {
  const status = localStatus(order, local);
  const last = order.attempts.at(-1);
  return {
    ...order,
    status,
    overdue: isOverdue({ due_at: order.due_at, status }, now),
    is_new: !local.seen.has(order.id),
    rejection: status === 'rejected' && last?.review_status === 'rejected' ? last.review_comment : null,
  };
}

type OrderRef = { order_number: number; title: string };

/**
 * Pendências (queue.md): itens da fila em ordem, depois os envios recusados e as recusas de início e materiais.
 * `sending`: o processador está rodando; o primeiro item pronto é o que está no ar.
 */
export function pendingItems(
  local: LocalState,
  orders: Map<string, OrderRef>,
  { now, sending }: { now: number; sending: boolean },
): PendingItem[] {
  const ref = (orderId: string) => orders.get(orderId) ?? { order_number: 0, title: '' };
  const queue = [...local.queue].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const heads = new Map<string, QueueItem>();
  for (const i of queue) if (!heads.has(i.orderId)) heads.set(i.orderId, i);
  const ready = (i: QueueItem) => i.state === 'pending' && heads.get(i.orderId) === i && i.nextAttemptAt <= now;
  const inFlight = sending ? queue.find(ready) : undefined;

  const fromQueue = queue.map((i): PendingItem => {
    const draft = i.type === 'submit' ? local.drafts.find((d) => d.id === i.payload.draftId) : undefined;
    const photos = draft ? local.photos.filter((p) => p.draftId === draft.id) : null;
    const state: PendingItem['state'] =
      i.state === 'blocked'
        ? 'blocked'
        : heads.get(i.orderId) !== i
          ? 'queued'
          : i.nextAttemptAt > now && i.attempts > 0
            ? 'waiting'
            : i === inFlight
              ? 'sending'
              : 'queued';
    return {
      id: `queue:${i.id}`,
      kind: i.type === 'submit' ? (draft?.supplementsExecutionId ? 'supplement' : 'submit') : i.type,
      state,
      order_id: i.orderId,
      order_number: ref(i.orderId).order_number,
      order_title: ref(i.orderId).title,
      created_at: i.createdAt,
      next_attempt_at: i.nextAttemptAt > now ? new Date(i.nextAttemptAt).toISOString() : null,
      refusal: null,
      error: i.state === 'blocked' ? i.lastError : null,
      photos: photos ? { done: photos.filter((p) => p.uploaded).length, total: photos.length } : null,
    };
  });

  const refusedDrafts = local.drafts
    .filter((d) => d.state === 'refused')
    .map(
      (d): PendingItem => ({
        id: `draft:${d.id}`,
        kind: d.supplementsExecutionId ? 'supplement' : 'submit',
        state: 'refused',
        order_id: d.orderId,
        order_number: ref(d.orderId).order_number,
        order_title: ref(d.orderId).title,
        created_at: d.updatedAt,
        next_attempt_at: null,
        refusal: d.refusal,
        error: null,
        photos: null,
      }),
    );

  const refusals = local.refusals.map(
    (r): PendingItem => ({
      id: `refusal:${r.id}`,
      kind: r.type,
      state: 'refused',
      order_id: r.orderId,
      order_number: ref(r.orderId).order_number,
      order_title: ref(r.orderId).title,
      created_at: r.createdAt,
      next_attempt_at: null,
      refusal: r.code,
      error: null,
      photos: null,
    }),
  );

  return [...fromQueue, ...refusedDrafts, ...refusals];
}

/** Alertas das fotos do rascunho, calculados como o doc 04 manda (src/photos/alerts.ts). */
export function withAlerts(photos: PhotoData[], startedAt: string | null): PhotoData[] {
  return photos.map((p) => ({
    ...p,
    alerts: photoAlerts({ source: p.source, capturedAt: p.captured_at }, { clientStartedAt: startedAt }),
  }));
}

/** F9 (photos.md): a foto abre pelo arquivo guardado no aparelho quando há; senão pela URL assinada. */
export function withLocalPhotos<A extends { photos: PhotoData[]; supplements: { photos: PhotoData[] }[] }>(
  attempts: A[],
  localUrl: (photoId: string) => string | null,
): A[] {
  const swap = (photos: PhotoData[]) => photos.map((p) => ({ ...p, url: localUrl(p.id) ?? p.url }));
  return attempts.map((a) => ({
    ...a,
    photos: swap(a.photos),
    supplements: a.supplements.map((s) => ({ ...s, photos: swap(s.photos) })),
  }));
}

/** Dias que a O.S. aprovada ou cancelada fica na lista do técnico (docs/screens-technician.md, Decisões). */
export const CLOSED_VISIBLE_DAYS = 7;
const CLOSED_STATUSES: readonly string[] = ['approved', 'cancelled'];

/** Início da janela das encerradas: `updated_at` é a hora do fechamento (nada muda a O.S. depois dele). */
export function closedCutoff(now: number): string {
  return new Date(now - CLOSED_VISIBLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Em andamento, sempre; aprovada ou cancelada, só nos 7 dias depois do fechamento. */
export function inTechnicianList(o: Pick<OrderDetail, 'status' | 'updated_at'>, now: number): boolean {
  return !CLOSED_STATUSES.includes(o.status) || o.updated_at >= closedCutoff(now);
}

/**
 * Aviso depois de "Enviar" (execução e complemento). O real sempre enfileira (queue.md, Q4); com sinal, a fila
 * manda na hora, então o aviso é de envio em andamento, não de falta de sinal.
 */
export function sendNotice(result: 'sent' | 'queued', offline: boolean): 'sentToast' | 'queuedToast' | 'sendingToast' {
  if (result === 'sent') return 'sentToast';
  return offline ? 'queuedToast' : 'sendingToast';
}
