// Ações do técnico: gravam no aparelho primeiro (Dexie) e acordam a fila; nada espera o servidor (offline.md).
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { db, type Draft as LocalDraft } from '@/offline/db';
import { dismissRefusal, enqueueMaterials, enqueueStart, enqueueSubmit, retryBlocked } from '@/offline/queue';
import { classifyRpcError } from '@/offline/queue/errors';
import { removePhotoFromDraft, savePhotoToDraft } from '@/photos/draft-photos';
import { processPhoto } from '@/photos/process';
import type { DraftFields, TechnicianApi, TechOrder } from '../types';
import { current } from './context';
import { localSnapshot, parseDraftKey } from './local';
import { queued } from './runner';

const nowIso = () => new Date().toISOString();
const blankToNull = (v: string | null) => (v && v.trim() !== '' ? v.trim() : null);

function editingDraft(orderId: string, attemptId: string | null): Promise<LocalDraft | undefined> {
  const { userId } = current();
  return db.drafts
    .where('userId')
    .equals(userId)
    .filter((d) => d.orderId === orderId && d.supplementsExecutionId === attemptId && d.state === 'editing')
    .first();
}

/** Início guardado para a tentativa: o "iniciar" ainda na fila, se houver (o rascunho é criado depois). */
function queuedStart(orderId: string): string | null {
  const start = localSnapshot()?.queue.find((i) => i.orderId === orderId && i.type === 'start');
  return start?.type === 'start' ? start.payload.clientStartedAt : null;
}

/** Rascunho `editing` da chave; cria se ainda não há. `id` é o `execution_id` (gerado no aparelho). */
async function ensureDraft(key: string, fields: DraftFields): Promise<LocalDraft> {
  const { userId } = current();
  const { orderId, attemptId } = parseDraftKey(key);
  const existing = await editingDraft(orderId, attemptId);
  if (existing) {
    const patch = { description: fields.description, participants: fields.participants, updatedAt: nowIso() };
    await db.drafts.update(existing.id, patch);
    return { ...existing, ...patch };
  }
  const draft: LocalDraft = {
    id: crypto.randomUUID(),
    userId,
    orderId,
    supplementsExecutionId: attemptId,
    description: fields.description,
    participants: fields.participants.includes(userId) ? fields.participants : [userId, ...fields.participants],
    clientStartedAt: attemptId ? null : queuedStart(orderId),
    state: 'editing',
    refusal: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.drafts.add(draft);
  return draft;
}

async function deleteDraft(id: string) {
  await db.transaction('rw', db.drafts, db.photos, async () => {
    await db.photos.where('draftId').equals(id).delete();
    await db.drafts.delete(id);
  });
}

/** Quem a tentativa já traz marcado: quem envia e a dupla atual (docs/screens-technician.md). */
const defaultParticipants = (order: TechOrder) =>
  order.participantOptions.filter((p) => p.isSelf || p.active).map((p) => p.id);

export const actions: Omit<
  TechnicianApi,
  | 'useTimeZone'
  | 'useTechSession'
  | 'useMyOrders'
  | 'useTechOrder'
  | 'usePendingItems'
  | 'useQueueDraft'
  | 'useSyncStatus'
  | 'useDraft'
  | 'useSimulatedOffline'
  | 'useStorageProtection'
  | 'CameraSheet'
  | 'pickFromGallery'
> = {
  notify: (text) => toast.success(text),

  markSeen(orderId) {
    const { userId } = current();
    void db.seen.put({ userId, orderId, seenAt: nowIso() });
  },

  /** 04, R1: o início fica no rascunho da tentativa e vai para a fila; repetir não muda o horário. */
  async start(order) {
    const { userId } = current();
    const at = nowIso();
    const draft = await editingDraft(order.id, null);
    if (draft?.clientStartedAt) return;
    if (draft) await db.drafts.update(draft.id, { clientStartedAt: at, updatedAt: at });
    else {
      await db.drafts.add({
        id: crypto.randomUUID(),
        userId,
        orderId: order.id,
        supplementsExecutionId: null,
        description: '',
        participants: defaultParticipants(order),
        clientStartedAt: at,
        state: 'editing',
        refusal: null,
        createdAt: at,
        updatedAt: at,
      });
    }
    await enqueueStart(db, { userId, orderId: order.id, clientStartedAt: at });
    queued();
  },

  async saveDraft(key, fields) {
    await ensureDraft(key, fields);
  },

  async addPhoto(key, fields, input) {
    const { userId } = current();
    const draft = await ensureDraft(key, fields);
    const photo = await processPhoto(input);
    await savePhotoToDraft(db, { draftId: draft.id, userId, photo });
  },

  async removePhoto(_key, photoId) {
    await removePhotoFromDraft(db, { photoId, userId: current().userId });
  },

  async discardDraft(key) {
    const { orderId, attemptId } = parseDraftKey(key);
    const draft = await editingDraft(orderId, attemptId);
    if (draft) await deleteDraft(draft.id);
  },

  /** Q4, Q5: o rascunho vira item da fila com o relógio do toque; a fila manda uma foto por vez. */
  async submit(_order, key) {
    const { userId } = current();
    const { orderId, attemptId } = parseDraftKey(key);
    const draft = await editingDraft(orderId, attemptId);
    if (draft) await enqueueSubmit(db, { userId, draftId: draft.id, clientSubmittedAt: nowIso() });
    queued();
    return 'queued';
  },

  /** 03: `expected` é o texto do servidor de onde a edição partiu (com um item na fila, o dele). */
  async saveMaterials(order, text) {
    const { userId } = current();
    const server = (await current().queryClient.getQueryData<{ materials_notes: string | null }>([
      'technician',
      'order',
      order.id,
    ])) ?? { materials_notes: order.materials_notes };
    await enqueueMaterials(db, {
      userId,
      orderId: order.id,
      text: blankToNull(text),
      expected: blankToNull(server.materials_notes),
    });
    queued();
  },

  /** O técnico escolheu o texto: a recusa sai e a edição parte do texto atual do servidor. */
  async resolveConflict(order, text) {
    const { userId } = current();
    const conflicts = await db.refusals
      .where('userId')
      .equals(userId)
      .filter((r) => r.orderId === order.id && r.type === 'materials' && r.code === 'conflict')
      .toArray();
    const current_ = conflicts.at(-1)?.current ?? null;
    for (const r of conflicts) await dismissRefusal(db, r.id as number);
    await enqueueMaterials(db, { userId, orderId: order.id, text: blankToNull(text), expected: current_ });
    queued();
  },

  async removePending(id) {
    const [kind, key] = id.split(':');
    if (kind === 'draft' && key) {
      const draft = await db.drafts.get(key);
      if (draft?.state === 'refused' && draft.userId === current().userId) await deleteDraft(key);
    } else if (kind === 'refusal' && key) await dismissRefusal(db, Number(key));
  },

  async retryPending(id) {
    const [kind, key] = id.split(':');
    if (kind !== 'queue' || !key) return;
    const itemId = Number(key);
    const item = await db.queue.get(itemId);
    if (item?.state === 'blocked') await retryBlocked(db, itemId);
    else if (item) await db.queue.update(itemId, { nextAttemptAt: 0 });
    queued();
  },

  /** Perfil (01): update direto do próprio nome e telefone; só com sinal. */
  async saveProfile(profile) {
    const { userId, queryClient } = current();
    const { data, error, status } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name.trim(), phone: blankToNull(profile.phone) })
      .eq('id', userId)
      .select('id')
      .maybeSingle();
    if (error) throw classifyRpcError(error, status);
    if (!data) throw new Error('profile update returned no row');
    await queryClient.invalidateQueries({ queryKey: ['technician', 'session'] });
  },
};
