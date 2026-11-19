// Banco local do aparelho (IndexedDB, Dexie): rascunhos, fotos comprimidas e a fila de envio do técnico.
// É o contrato entre a fila (src/offline/queue) e as fotos (src/photos): docs/queue.md e docs/photos.md.
// Tudo fica preso ao usuário que criou (userId): a fila de quem saiu não é enviada por outro usuário.
// Mudou o schema? Nova versão em db.version(n), com teste de upgrade a partir dos dados da anterior; nunca editar uma
// versão que já foi para produção. A versão 1 junta as de antes do primeiro deploy (docs/e2e.md, P8).
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

/** `start_execution`: o relógio do aparelho no "iniciar" (04, R1). */
export interface StartPayload {
  clientStartedAt: string;
}

/** `submit_execution` de um rascunho (docs/queue.md, Q4 e Q5). */
export interface SubmitPayload {
  draftId: string;
  /** Relógio do aparelho no toque em "Enviar" (Q5). */
  clientSubmittedAt: string;
  /** Fotos com PUT feito e confirmação ainda pendente: a retomada confirma sem reenviar o arquivo. */
  stagedPhotoIds: string[];
}

/** `update_materials_notes` (03): só a última edição por O.S., com o texto que o aparelho viu do servidor. */
export interface MaterialsPayload {
  text: string | null;
  expected: string | null;
}

interface QueueItemBase {
  id?: number;
  userId: string;
  orderId: string;
  /** pending: vai ser tentado; blocked: erro de bug, pausado até ação do técnico (nunca descartado). */
  state: 'pending' | 'blocked';
  /** Falhas seguidas de rede ou servidor (espera crescente, Q7). */
  attempts: number;
  /** Epoch ms: antes disso não tenta de novo (espera crescente). */
  nextAttemptAt: number;
  /** Por que espera (Q7): só a espera por rede vence com um indício de conexão; a por servidor, não. */
  waitingFor: 'network' | 'server' | null;
  lastError: string | null;
  createdAt: string;
}

/** Item da fila. A ordem é o `id` (autoincremento), FIFO por O.S. (docs/queue.md). */
export type QueueItem = QueueItemBase &
  (
    | { type: 'start'; payload: StartPayload }
    | { type: 'submit'; payload: SubmitPayload }
    | { type: 'materials'; payload: MaterialsPayload }
  );

/**
 * Recusa por regra de um item sem rascunho (`start`, `materials`), guardada para a tela mostrar até o técnico
 * dispensar. A recusa de um envio fica no próprio rascunho (`Draft.refusal`).
 */
export type QueueRefusal = {
  id?: number;
  userId: string;
  orderId: string;
  /** Código do catálogo (errors.md do backend). */
  code: string;
  /** Texto atual do servidor no `conflict` de materiais (`details.current`); senão `null`. */
  current: string | null;
  createdAt: string;
} & ({ type: 'start'; payload: StartPayload } | { type: 'materials'; payload: MaterialsPayload });

/** O.S. que o técnico já abriu neste aparelho: sem linha aqui, a O.S. aparece como "Nova" (04). */
export interface SeenOrder {
  userId: string;
  orderId: string;
  seenAt: string;
}

/** Cache persistido das leituras do técnico (TanStack Query), um por usuário: abre sem sinal (offline.md). */
export interface CachedQueries {
  userId: string;
  /** O cliente do TanStack Query desidratado, em JSON. */
  value: string;
  savedAt: string;
}

/** Foto do servidor já vista no aparelho, guardada como arquivo para abrir sem sinal (photos.md, F8 a F10). */
export interface SeenPhoto {
  userId: string;
  photoId: string;
  orderId: string;
  blob: Blob;
  savedAt: string;
}

export class FastDb extends Dexie {
  drafts!: EntityTable<Draft, 'id'>;
  photos!: EntityTable<DraftPhoto, 'id'>;
  queue!: EntityTable<QueueItem, 'id'>;
  refusals!: EntityTable<QueueRefusal, 'id'>;
  seen!: EntityTable<SeenOrder, 'orderId'>;
  cache!: EntityTable<CachedQueries, 'userId'>;
  seenPhotos!: EntityTable<SeenPhoto, 'photoId'>;

  constructor(name = 'fast') {
    super(name);
    this.version(1).stores({
      drafts: 'id, userId, orderId, state',
      photos: 'id, draftId, userId, orderId',
      queue: '++id, userId, orderId, [userId+orderId], nextAttemptAt',
      refusals: '++id, userId, orderId',
      seen: '[userId+orderId], userId',
      cache: 'userId',
      seenPhotos: '[userId+photoId], userId, [userId+orderId]',
    });
  }
}

export const db = new FastDb();
