// Dados e estado de exemplo só do técnico (CLAUDE.md, "Scratch visual"). Lê os mocks do kit (src/mocks) pelas mesmas
// funções que imitam as consultas reais e guarda, em memória, o efeito das ações da tela (iniciar, rascunho, enviar,
// materiais, apagar pendência, perfil). Recarregar a página volta ao estado inicial. Na integração, este arquivo some:
// o estado vira o Dexie (rascunhos e fila) e as consultas viram o Supabase.
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import type { AttemptData, ExecutionData } from '@/components/execution-card';
import type { PhotoData } from '@/components/photos';
import type { OrderStatus, PhotoSource } from '@/lib/enums';
import {
  getOrder,
  getPerson,
  getSessionUser,
  getSyncState,
  listMyOrders,
  listPendingItems,
  MOCK_TIME_ZONE,
  MOCK_USER_IDS,
  type OrderDetail,
  type OrderListItem,
  type PendingItem,
  type PersonRef,
  type SyncState,
  samplePhotoUrl,
} from '@/mocks';
import { executionAlerts, photoAlerts } from '@/photos/alerts';

export const TZ = MOCK_TIME_ZONE;
/** O técnico "logado" nos dados de exemplo (Marcos), não o usuário real do login. */
export const ME = MOCK_USER_IDS.technician;

type Scene = Parameters<typeof samplePhotoUrl>[0];
const SCENES: Scene[] = ['dome', 'bullet', 'cabling', 'recorder', 'monitor', 'power', 'facade'];
const MINUTE = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

// ---------------------------------------------------------------- dados extras (a partir dos mocks do kit)

/** Rascunho guardado no aparelho (no real, `drafts` e `photos` do Dexie). */
export interface Draft {
  /** `client_started_at` (só na tentativa; o complemento não tem início). */
  startedAt: string | null;
  description: string;
  participants: string[];
  photos: PhotoData[];
}

function samplePhoto(scene: Scene, seed: string, source: PhotoSource, capturedAt: string | null): PhotoData {
  return {
    id: `${seed}-${scene}`,
    url: samplePhotoUrl(scene, seed),
    source,
    captured_at: capturedAt,
    accuracy_m: source === 'camera' ? 8 : null,
    latitude: source === 'camera' ? -23.58 : null,
    alerts: [],
  };
}

/** O que foi feito em cada envio que está na fila do aparelho (o PendingItem do kit só tem o resumo). */
const seededQueueDrafts: Record<string, Pick<Draft, 'description' | 'photos'>> = {
  q1: {
    description: 'Fonte 12V 10A trocada e as 4 câmeras voltaram. Borne refeito com fita isolante.',
    photos: (['power', 'cabling', 'dome', 'monitor', 'bullet'] as Scene[]).map((s, i) =>
      samplePhoto(s, 'q1', 'camera', iso(Date.now() - (40 - i * 4) * MINUTE)),
    ),
  },
  q4: {
    description: 'Câmeras do estoque reposicionadas; ângulo do corredor 3 validado com o gerente.',
    photos: (['bullet', 'dome', 'monitor'] as Scene[]).map((s, i) =>
      samplePhoto(s, 'q4', 'camera', iso(Date.now() - (27 * 60 - i * 5) * MINUTE)),
    ),
  },
  q6: {
    description: 'Sensor da doca trocado de lugar, longe da porta de enrolar.',
    photos: [samplePhoto('power', 'q6', 'camera', iso(Date.now() - 190 * MINUTE))],
  },
};

/**
 * Recusa `conflict` de materiais (03, R11): o texto que o técnico mandou e o texto que o escritório gravou nesse meio
 * tempo (`details.current`). Ligada ao item q5 dos mocks do kit (O.S. #0041).
 */
const seededConflicts: Record<number, { pendingId: string; mine: string; current: string }> = {
  41: {
    pendingId: 'q5',
    mine: 'DVR 4 canais\n4 câmeras dome\nUsado: 42 m de cabo UTP, 8 conectores RJ45',
    current: 'DVR 4 canais\n4 câmeras dome\nLevar escada de 3 m e uma fonte reserva',
  },
};

// ---------------------------------------------------------------- estado em memória

interface LocalSubmission {
  id: string;
  orderId: string;
  /** Tentativa que o complemento soma; `null` = tentativa nova. */
  attemptId: string | null;
  draft: Draft;
  submittedAt: string;
}

interface ScratchState {
  /** Simula "sem sinal" (no real, o último request que falhou; nunca `navigator.onLine`). */
  offline: boolean;
  seen: string[];
  started: Record<string, string>;
  drafts: Record<string, Draft>;
  /** Envios aceitos (com sinal), somados ao detail da O.S. */
  submissions: LocalSubmission[];
  /** Itens novos na fila (sem sinal). */
  queue: PendingItem[];
  queueDrafts: Record<string, Pick<Draft, 'description' | 'photos'>>;
  removedPending: string[];
  pendingState: Record<string, PendingItem['state']>;
  materials: Record<string, string>;
  resolvedConflicts: number[];
  profile: { full_name: string; phone: string | null } | null;
}

let state: ScratchState = {
  offline: false,
  seen: [],
  started: {},
  drafts: {},
  submissions: [],
  queue: [],
  queueDrafts: seededQueueDrafts,
  removedPending: [],
  pendingState: {},
  materials: {},
  resolvedConflicts: [],
  profile: null,
};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function update(change: (s: ScratchState) => Partial<ScratchState>) {
  state = { ...state, ...change(state) };
  for (const listener of listeners) listener();
}

export function useScratch(): ScratchState {
  return React.useSyncExternalStore(subscribe, () => state);
}

export const draftKey = {
  attempt: (orderId: string) => `attempt:${orderId}`,
  supplement: (orderId: string, attemptId: string) => `supplement:${orderId}:${attemptId}`,
};

interface OrderRef {
  id: string;
  order_number: number;
  title: string;
}

function queueItem(order: OrderRef, kind: PendingItem['kind'], photos: number | null): PendingItem {
  return {
    id: `local-${crypto.randomUUID()}`,
    kind,
    state: 'waiting',
    order_id: order.id,
    order_number: order.order_number,
    order_title: order.title,
    created_at: iso(Date.now()),
    next_attempt_at: iso(Date.now() + 30_000),
    refusal: null,
    error: null,
    photos: photos === null ? null : { done: 0, total: photos },
  };
}

export const scratch = {
  setOffline(offline: boolean) {
    update(() => ({ offline }));
  },
  markSeen(orderId: string) {
    if (!state.seen.includes(orderId)) update((s) => ({ seen: [...s.seen, orderId] }));
  },
  /** 04, R1: "iniciar" só muda o status; o aparelho guarda `client_started_at`. Sem sinal, entra na fila. */
  start(order: OrderRef): string {
    const at = iso(Date.now());
    update((s) => ({
      started: { ...s.started, [order.id]: at },
      queue: s.offline ? [...s.queue, queueItem(order, 'start', null)] : s.queue,
    }));
    const key = draftKey.attempt(order.id);
    const draft = state.drafts[key];
    if (draft) scratch.saveDraft(key, { ...draft, startedAt: at });
    return at;
  },
  saveDraft(key: string, draft: Draft) {
    update((s) => ({ drafts: { ...s.drafts, [key]: draft } }));
  },
  discardDraft(key: string) {
    update((s) => {
      const { [key]: _, ...drafts } = s.drafts;
      return { drafts };
    });
  },
  /** Com sinal, o envio é aceito na hora; sem sinal, vira item da fila e o rascunho fica preso a ele. */
  submit(order: OrderRef, key: string, attemptId: string | null): 'sent' | 'queued' {
    const draft = state.drafts[key];
    if (!draft) return 'sent';
    const offline = state.offline;
    update((s) => {
      const { [key]: _, ...drafts } = s.drafts;
      if (s.offline) {
        const item = queueItem(order, attemptId ? 'supplement' : 'submit', draft.photos.length);
        return {
          drafts,
          queue: [...s.queue, item],
          queueDrafts: { ...s.queueDrafts, [item.id]: draft },
        };
      }
      const submission: LocalSubmission = {
        id: crypto.randomUUID(),
        orderId: order.id,
        attemptId,
        draft,
        submittedAt: iso(Date.now()),
      };
      return { drafts, submissions: [...s.submissions, submission] };
    });
    return offline ? 'queued' : 'sent';
  },
  /** 03: sem sinal, guarda só a última edição por O.S. (queue.md, decisão de 2026-11-13). */
  saveMaterials(order: OrderRef, text: string) {
    update((s) => {
      const hasItem = s.queue.some((i) => i.order_id === order.id && i.kind === 'materials');
      return {
        materials: { ...s.materials, [order.id]: text },
        queue: s.offline && !hasItem ? [...s.queue, queueItem(order, 'materials', null)] : s.queue,
      };
    });
  },
  resolveConflict(order: OrderRef, text: string) {
    const conflict = seededConflicts[order.order_number];
    update((s) => ({
      resolvedConflicts: [...s.resolvedConflicts, order.order_number],
      removedPending: conflict ? [...s.removedPending, conflict.pendingId] : s.removedPending,
    }));
    scratch.saveMaterials(order, text);
  },
  removePending(id: string) {
    update((s) => ({ removedPending: [...s.removedPending, id] }));
  },
  retryPending(id: string) {
    update((s) => ({ pendingState: { ...s.pendingState, [id]: 'queued' } }));
  },
  saveProfile(profile: { full_name: string; phone: string | null }) {
    update(() => ({ profile }));
  },
};

// ---------------------------------------------------------------- fotos de exemplo da câmera e da galeria

let photoCounter = 0;

/**
 * Foto de exemplo no lugar da câmera e da galeria reais. Galeria alterna os casos da prova fotográfica (04): tirada
 * antes do início, sem EXIF e normal.
 */
export function newSamplePhoto(source: PhotoSource): PhotoData {
  photoCounter += 1;
  const id = crypto.randomUUID();
  const scene = SCENES[photoCounter % SCENES.length] as Scene;
  const galleryCase = photoCounter % 3;
  const capturedAt =
    source === 'camera'
      ? iso(Date.now())
      : galleryCase === 0
        ? iso(Date.now() - 2 * 24 * 60 * MINUTE)
        : galleryCase === 1
          ? null
          : iso(Date.now() - 10 * MINUTE);
  return {
    id,
    url: samplePhotoUrl(scene, id),
    source,
    captured_at: capturedAt,
    accuracy_m: source === 'camera' ? 6 + (photoCounter % 9) : null,
    latitude: source === 'camera' ? -23.58 : null,
    alerts: [],
  };
}

/** Alertas das fotos do rascunho, calculados como o doc 04 manda (src/photos/alerts.ts). */
export function withAlerts(photos: PhotoData[], startedAt: string | null): PhotoData[] {
  return photos.map((p) => ({
    ...p,
    alerts: photoAlerts({ source: p.source, capturedAt: p.captured_at }, { clientStartedAt: startedAt }),
  }));
}

// ---------------------------------------------------------------- leituras (TanStack Query) com o estado local

const person = (id: string): PersonRef => getPerson(id) ?? { id, full_name: '—' };

function effectiveStatus(
  order: { id: string; status: OrderStatus },
  s: ScratchState,
  localAttempts: number,
): OrderStatus {
  if (order.status === 'cancelled' || order.status === 'approved') return order.status;
  if (localAttempts > 0) return 'pending_approval';
  if (s.started[order.id] && (order.status === 'open' || order.status === 'rejected')) return 'in_progress';
  return order.status;
}

/** 03, R6: atrasada é calculada (prazo vencido em open, in_progress ou rejected). */
function isOverdue(dueAt: string | null, status: OrderStatus): boolean {
  return dueAt !== null && Date.parse(dueAt) < Date.now() && ['open', 'in_progress', 'rejected'].includes(status);
}

export function useTechSession() {
  const s = useScratch();
  const query = useQuery({ queryKey: ['technician', 'session'], queryFn: () => getSessionUser('technician') });
  const data =
    query.data && s.profile ? { ...query.data, profile: { ...query.data.profile, ...s.profile } } : query.data;
  return { ...query, data };
}

export type MyOrder = OrderListItem & {
  is_new: boolean;
  /** Motivo da última rejeição (só nas rejeitadas), para o cartão. */
  rejection: string | null;
};

async function fetchMyOrders(): Promise<MyOrder[]> {
  const list = await listMyOrders(ME);
  const rejected = await Promise.all(list.filter((o) => o.status === 'rejected').map((o) => getOrder(o.id)));
  return list.map((o) => {
    const detail = rejected.find((d) => d?.id === o.id);
    const last = detail?.attempts.at(-1);
    return { ...o, rejection: last?.review_status === 'rejected' ? last.review_comment : null };
  });
}

/** "Minhas O.S." (03, R14) com o efeito local de iniciar e enviar. */
export function useMyOrders() {
  const s = useScratch();
  const query = useQuery({ queryKey: ['technician', 'orders'], queryFn: fetchMyOrders });
  const data = React.useMemo(
    () =>
      query.data?.map((o) => {
        const local = s.submissions.filter((x) => x.orderId === o.id && x.attemptId === null).length;
        const status = effectiveStatus(o, s, local);
        return {
          ...o,
          status,
          overdue: isOverdue(o.due_at, status),
          is_new: o.is_new && !s.seen.includes(o.id),
          rejection: status === 'rejected' ? o.rejection : null,
        };
      }),
    [query.data, s],
  );
  return { ...query, data };
}

export interface ParticipantOption extends PersonRef {
  active: boolean;
  isSelf: boolean;
}

export type TechOrder = Omit<OrderDetail, 'attempts'> & {
  attempts: AttemptData[];
  /** Hora do início guardada neste aparelho. */
  startedHere: string | null;
  /** 04, R6: quem pode constar como participante (atribuído agora ou antes). */
  participantOptions: ParticipantOption[];
  /** Recusa `conflict` de materiais ainda não resolvida. */
  conflict: { mine: string; current: string } | null;
};

function toExecution(sub: LocalSubmission): ExecutionData {
  return {
    id: sub.id,
    description: sub.draft.description.trim() || null,
    submitter: person(ME),
    participant_refs: sub.draft.participants.map(person),
    client_started_at: sub.draft.startedAt,
    client_submitted_at: sub.submittedAt,
    received_at: sub.submittedAt,
    converted_to_supplement: false,
    is_late: false,
    acknowledged_at: null,
    acknowledger: null,
    photos: withAlerts(sub.draft.photos, sub.draft.startedAt).map((p) => ({ ...p, uploaded_at: sub.submittedAt })),
  };
}

function applyLocal(order: OrderDetail, s: ScratchState): TechOrder {
  const mine = s.submissions.filter((x) => x.orderId === order.id);
  const serverAttempts: AttemptData[] = order.attempts.map((a) => ({
    ...a,
    supplements: [...a.supplements, ...mine.filter((x) => x.attemptId === a.id).map(toExecution)],
  }));
  const localAttempts: AttemptData[] = mine
    .filter((x) => x.attemptId === null)
    .map((x, i) => ({
      ...toExecution(x),
      attempt_number: order.attempts.length + i + 1,
      review_status: 'pending',
      review_comment: null,
      reviewed_at: null,
      reviewer: null,
      alerts: executionAlerts(
        { clientSubmittedAt: x.submittedAt, receivedAt: x.submittedAt },
        { dueAt: order.due_at },
        order.attempts.map((a) => ({ reviewStatus: a.review_status, reviewedAt: a.reviewed_at })),
      ),
      supplements: mine.filter((y) => y.attemptId === x.id).map(toExecution),
    }));
  const status = effectiveStatus(order, s, localAttempts.length);
  const options = new Map<string, ParticipantOption>();
  for (const a of order.assignments) {
    const prev = options.get(a.user_id);
    options.set(a.user_id, {
      ...a.user,
      active: Boolean(prev?.active) || a.unassigned_at === null,
      isSelf: a.user_id === ME,
    });
  }
  const conflict = seededConflicts[order.order_number];
  return {
    ...order,
    status,
    overdue: isOverdue(order.due_at, status),
    materials_notes: s.materials[order.id] ?? order.materials_notes,
    attempts: [...serverAttempts, ...localAttempts],
    startedHere: s.started[order.id] ?? null,
    participantOptions: [...options.values()].sort((a, b) => Number(b.isSelf) - Number(a.isSelf)),
    conflict:
      conflict && !s.resolvedConflicts.includes(order.order_number) && !s.removedPending.includes(conflict.pendingId)
        ? { mine: conflict.mine, current: conflict.current }
        : null,
  };
}

export function useTechOrder(orderId: string) {
  const s = useScratch();
  const query = useQuery({ queryKey: ['technician', 'order', orderId], queryFn: () => getOrder(orderId) });
  const data = React.useMemo(() => (query.data ? applyLocal(query.data, s) : query.data), [query.data, s]);
  return { ...query, data };
}

/** Fila e recusas do aparelho (no real, Dexie: `queue`, `drafts` recusados e `refusals`). */
export function usePendingItems() {
  const s = useScratch();
  const query = useQuery({ queryKey: ['technician', 'pending'], queryFn: () => listPendingItems() });
  const data = React.useMemo(() => {
    if (!query.data) return undefined;
    return [...query.data, ...s.queue]
      .filter((i) => !s.removedPending.includes(i.id))
      .map((i) => {
        const forced = s.pendingState[i.id];
        if (forced) return { ...i, state: forced };
        // Sem sinal, nada está "enviando": o que estava no ar volta a esperar a rede.
        if (s.offline && i.state === 'sending') return { ...i, state: 'waiting' as const };
        return i;
      });
  }, [query.data, s]);
  return { ...query, data };
}

export function useQueueDraft(itemId: string) {
  return useScratch().queueDrafts[itemId] ?? null;
}

/** Indicador de sincronização com o estado local (sem sinal, itens novos). */
export function useSyncStatus(): SyncState | undefined {
  const s = useScratch();
  const pending = usePendingItems().data;
  const query = useQuery({ queryKey: ['technician', 'sync'], queryFn: () => getSyncState() });
  if (!query.data || !pending) return undefined;
  const inQueue = pending.filter((i) => ['sending', 'waiting', 'queued'].includes(i.state)).length;
  return {
    ...query.data,
    online: !s.offline,
    syncing: !s.offline && pending.some((i) => i.state === 'sending'),
    pending: inQueue,
    blocked: pending.filter((i) => i.state === 'blocked').length,
  };
}
