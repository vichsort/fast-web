// O que a fila recebe por injeção (docs/queue.md, Q11): a API, o lock e o relógio. Sem React e sem DOM.
import type { Database } from '@/lib/database.types';

type Functions = Database['public']['Functions'];
export type StartExecutionArgs = Functions['start_execution']['Args'];
export type SubmitExecutionArgs = Functions['submit_execution']['Args'];
export type UpdateMaterialsNotesArgs = Functions['update_materials_notes']['Args'];

/** Entrada de `request_photo_upload` e `confirm_photo_upload` (04). */
export interface PhotoRef {
  order_id: string;
  execution_id: string;
  photo_id: string;
}

/**
 * Chamadas ao backend. Toda falha rejeita com `ApiError` (./errors), já classificada; qualquer outra exceção é
 * tratada como bug.
 */
export interface QueueApi {
  startExecution(args: StartExecutionArgs): Promise<void>;
  submitExecution(args: SubmitExecutionArgs): Promise<void>;
  /** Devolve o texto que ficou no servidor. */
  updateMaterialsNotes(args: UpdateMaterialsNotesArgs): Promise<{ materials_notes: string | null }>;
  requestPhotoUpload(photo: PhotoRef): Promise<{ already_uploaded: boolean; upload_url: string | null }>;
  /** PUT do arquivo na URL assinada, com `Content-Type: image/jpeg` e timeout generoso (Q8). */
  uploadPhoto(url: string, file: Blob): Promise<void>;
  confirmPhotoUpload(photo: PhotoRef): Promise<void>;
  /** Renova a sessão: `false` se o login acabou (rede caída rejeita com `ApiError` de rede). */
  refreshSession(): Promise<boolean>;
}

/** Roda `fn` com exclusão mútua entre a página e o service worker (Q9). */
export type QueueLock = <T>(fn: () => Promise<T>) => Promise<T>;

/** Relógio em epoch ms. */
export interface Clock {
  now(): number;
}
