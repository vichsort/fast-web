import { signalingFetch } from './response-signal';

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
