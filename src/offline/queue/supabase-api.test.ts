import { AuthApiError, AuthRetryableFetchError, FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { ApiError } from './errors';
import { createSupabaseQueueApi, type QueueSupabaseClient } from './supabase-api';

// Imita só o que o adaptador usa do @supabase/supabase-js 2.119: rpc(...).abortSignal(...), functions.invoke e
// auth.refreshSession, com as mesmas formas de resposta.
type RpcResult = { data: unknown; error: unknown; status: number };
type InvokeResult = { data: unknown; error: unknown };

function fakeClient(
  handlers: {
    rpc?: (fn: string, args: unknown, signal: AbortSignal) => Promise<RpcResult>;
    invoke?: (name: string, options: { body: unknown; timeout?: number }) => Promise<InvokeResult>;
    refresh?: () => Promise<{ data: { session: unknown }; error: unknown }>;
  } = {},
) {
  const calls: { kind: string; name: string; args: unknown }[] = [];
  const client = {
    rpc: (fn: string, args: unknown) => ({
      abortSignal: (signal: AbortSignal) => {
        calls.push({ kind: 'rpc', name: fn, args });
        return (handlers.rpc ?? (async () => ({ data: {}, error: null, status: 200 })))(fn, args, signal);
      },
    }),
    functions: {
      invoke: (name: string, options: { body: unknown; timeout?: number }) => {
        calls.push({ kind: 'invoke', name, args: options });
        return (handlers.invoke ?? (async () => ({ data: {}, error: null })))(name, options);
      },
    },
    auth: {
      refreshSession: () => (handlers.refresh ?? (async () => ({ data: { session: {} }, error: null })))(),
    },
  };
  return { client: client as unknown as QueueSupabaseClient, calls };
}

const rule = (message: string, details: string | null = null) => ({ code: 'P0001', message, details, hint: null });
const photo = { order_id: 'o1', execution_id: 'e1', photo_id: 'p1' };

describe('supabase queue api', () => {
  it('Q11: RPCs are called by name with their arguments', async () => {
    const { client, calls } = fakeClient({
      rpc: async (_fn, args) => ({
        data: { materials_notes: (args as { p_text: string }).p_text, status: 'in_progress' },
        error: null,
        status: 200,
      }),
    });
    const api = createSupabaseQueueApi(client);

    await api.startExecution({ p_order_id: 'o1', p_client_started_at: 't' });
    await api.submitExecution({
      p_execution_id: 'e1',
      p_order_id: 'o1',
      p_participants: ['u1'],
      p_client_submitted_at: 't',
    });
    const saved = await api.updateMaterialsNotes({ p_order_id: 'o1', p_text: 'cabo' });

    expect(calls.map((c) => [c.name, c.args])).toEqual([
      ['start_execution', { p_order_id: 'o1', p_client_started_at: 't' }],
      [
        'submit_execution',
        { p_execution_id: 'e1', p_order_id: 'o1', p_participants: ['u1'], p_client_submitted_at: 't' },
      ],
      ['update_materials_notes', { p_order_id: 'o1', p_text: 'cabo' }],
    ]);
    expect(saved).toEqual({ materials_notes: 'cabo' });
  });

  it('Q6: RPC failures reject with the classified error', async () => {
    const results: RpcResult[] = [
      { data: null, error: rule('conflict', '{"current":"x"}'), status: 400 },
      { data: null, error: { message: 'TypeError: fetch failed', details: '', hint: '', code: '' }, status: 0 },
    ];
    const { client } = fakeClient({ rpc: async () => results.shift() as RpcResult });
    const api = createSupabaseQueueApi(client);

    await expect(api.updateMaterialsNotes({ p_order_id: 'o1' })).rejects.toMatchObject({
      errorClass: 'rule',
      code: 'conflict',
      details: { current: 'x' },
    });
    await expect(api.startExecution({ p_order_id: 'o1', p_client_started_at: 't' })).rejects.toMatchObject({
      errorClass: 'network',
    });
  });

  it('Q6: an RPC that does not answer in time is a network failure', async () => {
    const { client } = fakeClient({
      rpc: (_fn, _args, signal) =>
        new Promise((resolve) =>
          signal.addEventListener('abort', () =>
            resolve({ data: null, error: { message: 'AbortError: aborted', code: '' }, status: 0 }),
          ),
        ),
    });
    const api = createSupabaseQueueApi(client, { requestTimeoutMs: 10 });

    await expect(api.startExecution({ p_order_id: 'o1', p_client_started_at: 't' })).rejects.toMatchObject({
      errorClass: 'network',
    });
  });

  it('Q4: the photo Edge Functions get the ids in the body', async () => {
    const { client, calls } = fakeClient({
      invoke: async (name) =>
        name === 'request_photo_upload'
          ? { data: { already_uploaded: false, upload_url: 'https://r2.test/p1', expires_at: 't' }, error: null }
          : { data: { photo_id: 'p1', uploaded_at: 't', file_size: 4 }, error: null },
    });
    const api = createSupabaseQueueApi(client, { requestTimeoutMs: 1234 });

    const upload = await api.requestPhotoUpload(photo);
    await api.confirmPhotoUpload(photo);

    expect(upload).toEqual({ already_uploaded: false, upload_url: 'https://r2.test/p1' });
    expect(calls.map((c) => [c.name, c.args])).toEqual([
      ['request_photo_upload', { body: photo, timeout: 1234 }],
      ['confirm_photo_upload', { body: photo, timeout: 1234 }],
    ]);
  });

  it('Q6: Edge Function failures reject with the classified error', async () => {
    const errors = [
      new FunctionsHttpError(new Response(JSON.stringify(rule('photo_missing_in_storage')), { status: 400 })),
      new FunctionsFetchError(new TypeError('fetch failed')),
    ];
    const { client } = fakeClient({ invoke: async () => ({ data: null, error: errors.shift() }) });
    const api = createSupabaseQueueApi(client);

    await expect(api.confirmPhotoUpload(photo)).rejects.toMatchObject({
      errorClass: 'rule',
      code: 'photo_missing_in_storage',
    });
    await expect(api.requestPhotoUpload(photo)).rejects.toMatchObject({ errorClass: 'network' });
  });

  it('Q4: the photo is PUT to the signed url as image/jpeg', async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    const fetchFake = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(null, { status: requests.length === 1 ? 200 : 503 });
    };
    const api = createSupabaseQueueApi(fakeClient().client, { fetch: fetchFake });
    const file = new Blob(['jpeg'], { type: 'image/jpeg' });

    await api.uploadPhoto('https://r2.test/p1', file);
    await expect(api.uploadPhoto('https://r2.test/p1', file)).rejects.toMatchObject({ errorClass: 'server' });

    expect(requests[0]).toMatchObject({
      url: 'https://r2.test/p1',
      init: { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: file },
    });
  });

  it('Q8: the PUT waits up to 5 minutes, then fails as network', async () => {
    vi.useFakeTimers();
    try {
      const fetchFake = (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
        );
      const api = createSupabaseQueueApi(fakeClient().client, { fetch: fetchFake });
      let settled: unknown = 'pending';
      const upload = api.uploadPhoto('https://r2.test/p1', new Blob(['jpeg'])).catch((error) => {
        settled = error;
      });

      await vi.advanceTimersByTimeAsync(5 * 60_000 - 1);
      expect(settled).toBe('pending');
      await vi.advanceTimersByTimeAsync(1);
      await upload;

      expect(settled).toBeInstanceOf(ApiError);
      expect(settled).toMatchObject({ errorClass: 'network' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('Q6: renewing the session says whether login is still valid; no network is not a lost login', async () => {
    const results = [
      { data: { session: { access_token: 'a' } }, error: null },
      { data: { session: null }, error: new AuthApiError('Invalid Refresh Token', 400, 'refresh_token_not_found') },
      { data: { session: null }, error: new AuthRetryableFetchError('fetch failed', 0) },
      { data: { session: null }, error: new AuthApiError('paused', 540, undefined) },
    ];
    const { client } = fakeClient({ refresh: async () => results.shift() as (typeof results)[number] });
    const api = createSupabaseQueueApi(client);

    expect(await api.refreshSession()).toBe(true);
    expect(await api.refreshSession()).toBe(false);
    await expect(api.refreshSession()).rejects.toMatchObject({ errorClass: 'network' });
    await expect(api.refreshSession()).rejects.toMatchObject({ errorClass: 'server' });
  });
});
