// API real da fila (docs/queue.md, Q11) sobre o @supabase/supabase-js: RPCs, Edge Functions das fotos, renovação
// da sessão e o PUT da foto com `fetch`. Toda falha vira `ApiError` classificada (./errors).
import { isAuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { PhotoRef, QueueApi } from './api';
import { ApiError, classifyFetchFailure, classifyFunctionError, classifyHttpStatus, classifyRpcError } from './errors';

export type QueueSupabaseClient = SupabaseClient<Database>;

export interface QueueApiOptions {
  /** O `fetch` do PUT da foto. */
  fetch?: typeof fetch;
  /** Timeout das RPCs e Edge Functions: sem ele, uma chamada pendurada seguraria a fila inteira. */
  requestTimeoutMs?: number;
  /** Timeout do PUT de uma foto (Q8): 400 KB em 2G leva minutos. */
  uploadTimeoutMs?: number;
}

const REQUEST_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 5 * 60_000;

type Functions = Database['public']['Functions'];
type QueueRpc = 'start_execution' | 'submit_execution' | 'update_materials_notes';

export function createSupabaseQueueApi(client: QueueSupabaseClient, options: QueueApiOptions = {}): QueueApi {
  const requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const uploadTimeoutMs = options.uploadTimeoutMs ?? UPLOAD_TIMEOUT_MS;
  const fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));

  async function rpc<F extends QueueRpc>(fn: F, args: Functions[F]['Args']): Promise<Functions[F]['Returns']> {
    const { data, error, status } = await withTimeout(requestTimeoutMs, (signal) =>
      client.rpc(fn, args).abortSignal(signal),
    );
    if (error) throw classifyRpcError(error, status);
    return data as unknown as Functions[F]['Returns'];
  }

  async function invoke<T>(name: string, body: PhotoRef): Promise<T> {
    const { data, error } = await client.functions.invoke<T>(name, { body, timeout: requestTimeoutMs });
    if (error) throw await classifyFunctionError(error);
    return data as T;
  }

  return {
    async startExecution(args) {
      await rpc('start_execution', args);
    },
    async submitExecution(args) {
      await rpc('submit_execution', args);
    },
    async updateMaterialsNotes(args) {
      const order = await rpc('update_materials_notes', args);
      return { materials_notes: order.materials_notes };
    },
    async requestPhotoUpload(photo) {
      const data = await invoke<{ already_uploaded: boolean; upload_url: string | null }>(
        'request_photo_upload',
        photo,
      );
      return { already_uploaded: data.already_uploaded, upload_url: data.upload_url };
    },
    async confirmPhotoUpload(photo) {
      await invoke('confirm_photo_upload', photo);
    },
    async uploadPhoto(url, file) {
      let response: Response;
      try {
        response = await withTimeout(uploadTimeoutMs, (signal) =>
          fetchImpl(url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: file, signal }),
        );
      } catch (error) {
        throw classifyFetchFailure(error);
      }
      if (!response.ok) throw classifyHttpStatus(response.status);
    },
    async refreshSession() {
      const { data, error } = await client.auth.refreshSession();
      if (!error) return data.session !== null;
      // Sem rede ou com o Supabase fora não dá para dizer que o login acabou.
      const status = (error as { status?: number }).status ?? 0;
      if (isAuthRetryableFetchError(error) && status === 0) throw new ApiError('network', null, error.message);
      if (isAuthRetryableFetchError(error) || status >= 500) throw new ApiError('server', null, error.message);
      return false;
    },
  };
}

/** Roda `fn` com um sinal que aborta depois de `ms`. */
async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
