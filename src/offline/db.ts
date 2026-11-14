// Banco local do aparelho (IndexedDB, Dexie): rascunhos, fotos comprimidas e a fila de envio do técnico.
// É o contrato entre a fila (src/offline/queue) e as fotos (src/photos): docs/queue.md e docs/photos.md.
// Tudo fica preso ao usuário que criou (userId): a fila de quem saiu não é enviada por outro usuário.
// Mudou o schema? Nova versão em db.version(n), nunca editar uma versão que já foi para produção.
import Dexie, { type EntityTable } from 'dexie';
import type { Database } from '@/lib/database.types';

export type PhotoSource = Database['public']['Enums']['photo_source'];

/** Rascunho de um envio (tentativa nova ou complemento). `id` é o `execution_id`, gerado no aparelho. */
export interface Draft {
  id: string;
  userId: string;
  orderId: string;
  /** Complemento explícito (04, R5); `null` é envio novo (que o banco pode converter em complemento, R4). */
  supplementsExecutionId: string | null;
  description: string;
  /** Inclui quem envia (04, R6). */
  participants: string[];
  /** Relógio do aparelho no "iniciar" (04, R1); ISO 8601. */
  clientStartedAt: string | null;
  /** editing: o técnico ainda mexe; queued: na fila; refused: recusado por regra (fica com o motivo). */
  state: 'editing' | 'queued' | 'refused';
  /** Código do catálogo (errors.md do backend) quando `state` é `refused`. */
  refusal: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Foto de um rascunho, já comprimida. `id` é o `photo_id`, gerado no aparelho. */
export interface DraftPhoto {
  id: string;
  draftId: string;
  userId: string;
  orderId: string;
  /** image/jpeg, lado maior até 1600 px (04, "Prova fotográfica"). */
  blob: Blob;
  source: PhotoSource;
  /** camera: relógio do aparelho no clique; gallery: data EXIF, ou `null` sem EXIF. ISO 8601. */
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  width: number;
  height: number;
  /** `confirm_photo_upload` respondeu sucesso: a foto já está no R2 e registrada. */
  uploaded: boolean;
  createdAt: string;
}

export type QueueItemType = 'start' | 'submit' | 'materials';

/**
 * Item da fila. A ordem é o `id` (autoincremento), FIFO por O.S. O formato do `payload` por tipo e os
 * estados são da fila (docs/queue.md).
 */
export interface QueueItem {
  id?: number;
  userId: string;
  orderId: string;
  type: QueueItemType;
  payload: unknown;
  /** pending: vai ser tentado; blocked: erro de bug, pausado até ação do técnico (nunca descartado). */
  state: 'pending' | 'blocked';
  attempts: number;
  /** Epoch ms: antes disso não tenta de novo (espera crescente). */
  nextAttemptAt: number;
  lastError: string | null;
  createdAt: string;
}

export class FastDb extends Dexie {
  drafts!: EntityTable<Draft, 'id'>;
  photos!: EntityTable<DraftPhoto, 'id'>;
  queue!: EntityTable<QueueItem, 'id'>;

  constructor(name = 'fast') {
    super(name);
    this.version(1).stores({
      drafts: 'id, userId, orderId, state',
      photos: 'id, draftId, userId, orderId',
      queue: '++id, userId, orderId, [userId+orderId], nextAttemptAt',
    });
  }
}

export const db = new FastDb();
