import { authTimeoutFetch, signalingFetch } from './supabase-fetch';

describe('signalingFetch', () => {
  it('tells after any HTTP response, an error status too: the network reached the server', async () => {
    const notify = vi.fn();
    const responses = [new Response('ok'), new Response('down', { status: 503 })];
    const fetch = signalingFetch(async () => responses.shift() as Response, notify);

    expect((await fetch('https://x.test')).status).toBe(200);
    expect((await fetch('https://x.test')).status).toBe(503);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('says nothing when the request never got an answer', async () => {
    const notify = vi.fn();
    const fetch = signalingFetch(async () => {
      throw new TypeError('Failed to fetch');
    }, notify);

    await expect(fetch('https://x.test')).rejects.toThrow('Failed to fetch');
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('authTimeoutFetch', () => {
  const hanging = (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) =>
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
    );

  it('gives up on an Auth request (session renewal) that never answers', async () => {
    const fetch = authTimeoutFetch(hanging, 10);

    await expect(fetch('http://x.test/auth/v1/token?grant_type=refresh_token', { method: 'POST' })).rejects.toThrow();
  });

  it('leaves the other requests alone: they bring their own signal or timeout', async () => {
    const seen: (AbortSignal | null | undefined)[] = [];
    const fetch = authTimeoutFetch(async (_input, init) => {
      seen.push(init?.signal);
      return new Response('ok');
    }, 10);

    await fetch('http://x.test/rest/v1/rpc/start_execution', { method: 'POST' });

    expect(seen).toEqual([undefined]);
  });

  it('keeps the signal the caller passed on an Auth request', async () => {
    const caller = new AbortController();
    const fetch = authTimeoutFetch(hanging, 60_000);
    const request = fetch('http://x.test/auth/v1/user', { signal: caller.signal });

    caller.abort(new Error('caller gave up'));

    await expect(request).rejects.toThrow('caller gave up');
  });
});
