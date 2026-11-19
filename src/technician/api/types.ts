// Contrato da API do técnico: o que as telas leem e chamam. Duas implementações cumprem o mesmo tipo: os dados de
// exemplo (./mock.ts) e a real (./real), com Supabase, o Dexie e a fila offline. A escolha é em ./index.ts.

import type * as React from 'react';
import type { AttemptData } from '@/components/execution-card';
import type { PhotoData } from '@/components/photos';
import type { MemberRole } from '@/lib/enums';
import type { Company, OrderDetail, OrderListItem, PendingItem, PersonRef, Profile, SyncState } from '@/lib/views';
import type { StorageProtection } from '@/offline/persistence';
import type { PhotoInput } from '@/photos/process';

/** Rascunho como a tela edita (no real, `drafts` e `photos` do Dexie). */
export interface Draft {
  /** `client_started_at` (só na tentativa; o complemento não tem início). */
  startedAt: string | null;
  description: string;
  participants: string[];
  photos: PhotoData[];
}

/** O que a tela muda no rascunho além das fotos. */
export type DraftFields = Pick<Draft, 'description' | 'participants'>;

export type MyOrder = OrderListItem & {
  is_new: boolean;
  /** Motivo da última rejeição (só nas rejeitadas), para o cartão. */
  rejection: string | null;
};

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

export interface OrderRef {
  id: string;
  order_number: number;
  title: string;
}

export interface TechSession {
  profile: Profile;
  role: MemberRole;
  company: Company;
}

/** O pedaço de um resultado do TanStack Query que as telas usam. */
export interface Read<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => unknown;
}

export const draftKey = {
  attempt: (orderId: string) => `attempt:${orderId}`,
  supplement: (orderId: string, attemptId: string) => `supplement:${orderId}:${attemptId}`,
};

export interface CameraSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cada clique: o arquivo, o horário e a posição (photos.md, F2 e F3). */
  onCapture: (photo: PhotoInput) => void;
}

export interface TechnicianApi {
  useTimeZone(): string;
  useTechSession(): Read<TechSession>;
  useMyOrders(): Read<MyOrder[]>;
  useTechOrder(orderId: string): Read<TechOrder | null>;
  usePendingItems(): Read<PendingItem[]>;
  /** O que foi feito num envio da fila ou recusado (texto e fotos), para Pendências. */
  useQueueDraft(itemId: string): Pick<Draft, 'description' | 'photos'> | null;
  useSyncStatus(): SyncState | undefined;
  /** Rascunho guardado para a chave (draftKey), ou `null` se ainda não há. */
  useDraft(key: string): Draft | null;
  /** Armazenamento persistente (queue.md, Q12): `denied` é a prova que o navegador pode apagar; `null` enquanto pede. */
  useStorageProtection(): StorageProtection | null;
  /** Só nos dados de exemplo: a chave "Simular sem sinal" do perfil. */
  useSimulatedOffline(): { offline: boolean; setOffline: (offline: boolean) => void } | null;

  /** Aviso de uma ação feita (nos dados de exemplo, o aviso de scratch). */
  notify(text: string): void;
  markSeen(orderId: string): void;
  /** 04, R1: grava o início no aparelho e põe na fila. */
  start(order: TechOrder): Promise<void>;
  saveDraft(key: string, fields: DraftFields): Promise<void>;
  /** Processa (compressão, EXIF) e guarda a foto no rascunho; sobe `storage_full` sem espaço. */
  addPhoto(key: string, fields: DraftFields, photo: PhotoInput): Promise<void>;
  removePhoto(key: string, photoId: string): Promise<void>;
  discardDraft(key: string): Promise<void>;
  /** Envio sempre pela fila (queue.md); `sent` só nos dados de exemplo com sinal. */
  submit(order: OrderRef, key: string, attemptId: string | null): Promise<'sent' | 'queued'>;
  saveMaterials(order: TechOrder, text: string): Promise<void>;
  resolveConflict(order: TechOrder, text: string): Promise<void>;
  /** Apaga um rascunho recusado ou dispensa uma recusa. */
  removePending(id: string): Promise<void>;
  /** Tenta agora um item bloqueado ou esperando a rede. */
  retryPending(id: string): Promise<void>;
  saveProfile(profile: { full_name: string; phone: string | null }): Promise<void>;
  /** Câmera do app: a de exemplo ou a real (getUserMedia). */
  CameraSheet: (props: CameraSheetProps) => React.ReactNode;
  /** Abre o seletor de fotos da galeria (vazio se o técnico cancelar). */
  pickFromGallery(): Promise<PhotoInput[]>;
}
