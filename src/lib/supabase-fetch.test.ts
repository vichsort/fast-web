import { authTimeoutFetch, bannedFetch, signalingFetch } from './supabase-fetch';

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

describe('bannedFetch', () => {
  const answer = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });
  const token = 'http://x.test/auth/v1/token?grant_type=refresh_token';

  it('tells when the session renewal is refused because the account was banned (06, R8: removed from every company)', async () => {
    const banned = vi.fn();
    const fetch = bannedFetch(answer(400, { code: 400, error_code: 'user_banned', msg: 'User Banned' }), banned);

    const response = await fetch(token, { method: 'POST' });

    expect(banned).toHaveBeenCalledOnce();
    // O supabase-js ainda lê a resposta inteira.
    expect(await response.json()).toMatchObject({ error_code: 'user_banned' });
  });

  it('reads the code in the format of the API version the supabase-js asks for (code instead of error_code)', async () => {
    const banned = vi.fn();
    await bannedFetch(answer(400, { code: 'user_banned', message: 'Invalid Refresh Token: User Banned' }), banned)(
      token,
      {
        method: 'POST',
      },
    );

    expect(banned).toHaveBeenCalledOnce();
  });

  it('says nothing for another refusal of the renewal, nor for a banned answer outside the token endpoint', async () => {
    const banned = vi.fn();
    await bannedFetch(answer(400, { error_code: 'refresh_token_not_found' }), banned)(token, { method: 'POST' });
    await bannedFetch(answer(400, { error_code: 'user_banned' }), banned)('http://x.test/rest/v1/orders');
    await bannedFetch(async () => new Response('<html>', { status: 502 }), banned)(token, { method: 'POST' });

    expect(banned).not.toHaveBeenCalled();
  });
});
