import { createPhotoUrlCache, PHOTO_URL_MARGIN_MS, PHOTO_URL_MIN_AGE_MS, PHOTO_URL_TTL_MS } from './orders-query';

const T0 = Date.parse('2026-11-23T12:00:00Z');

/** get_photo_urls falso: assina cada id com uma URL nova, vencendo em 5 min pelo relógio do "servidor". */
function server(options: { skewMs?: number; hidden?: string[] } = {}) {
  let signed = 0;
  const calls: string[][] = [];
  const clock = { now: T0 };
  const invoke = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
    expect(name).toBe('get_photo_urls');
    const ids = body.photo_ids as string[];
    calls.push(ids);
    const serverNow = clock.now + (options.skewMs ?? 0);
    return ids
      .filter((id) => !options.hidden?.includes(id))
      .map((photo_id) => ({
        photo_id,
        url: `https://r2/${photo_id}?sig=${++signed}`,
        expires_at: new Date(serverNow + PHOTO_URL_TTL_MS).toISOString(),
      })) as T;
  };
  return { calls, clock, invoke };
}

function setup(options?: Parameters<typeof server>[0]) {
  const s = server(options);
  const cache = createPhotoUrlCache(() => s.clock.now);
  return { ...s, urls: (ids: string[]) => cache.urls(ids, s.invoke), failed: cache.failed };
}

describe('photo url cache', () => {
  it('signs in batches of 100 and leaves out the photos the server does not return', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `p${i}`);
    const { calls, urls } = setup({ hidden: ['p3'] });

    const found = await urls(ids);

    expect(calls.map((c) => c.length)).toEqual([100, 50]);
    expect(found.size).toBe(149);
    expect(found.has('p3')).toBe(false);
  });

  it('reuses a still-valid url on the next read, so the browser does not download the photo again', async () => {
    const { calls, clock, urls } = setup();
    const first = await urls(['a', 'b']);

    clock.now += PHOTO_URL_TTL_MS - PHOTO_URL_MARGIN_MS - 1;
    const second = await urls(['a', 'b']);

    expect(calls).toHaveLength(1);
    expect(second).toEqual(first);
  });

  it('signs only what is new or about to expire', async () => {
    const { calls, clock, urls } = setup();
    const first = await urls(['a']);

    clock.now += PHOTO_URL_TTL_MS - PHOTO_URL_MARGIN_MS;
    const second = await urls(['a', 'b']);

    expect(calls).toEqual([['a'], ['a', 'b']]);
    expect(second.get('a')).not.toBe(first.get('a'));
  });

  it('does not trust an expires_at that looks later because the device clock is behind', async () => {
    const { calls, clock, urls } = setup({ skewMs: 2 * 60_000 });
    await urls(['a']);

    clock.now += PHOTO_URL_TTL_MS - PHOTO_URL_MARGIN_MS;
    await urls(['a']);

    expect(calls).toHaveLength(2);
  });

  it('renews an url that failed to load once it is not brand new, and only that photo', async () => {
    const { calls, clock, urls, failed } = setup();
    const first = await urls(['a', 'b']);

    clock.now += PHOTO_URL_MIN_AGE_MS;
    expect(failed('a', first.get('a') as string)).toBe(true);
    const second = await urls(['a', 'b']);

    expect(calls).toEqual([['a', 'b'], ['a']]);
    expect(second.get('a')).not.toBe(first.get('a'));
    expect(second.get('b')).toBe(first.get('b'));
  });

  it('does not renew in a loop: a fresh url, an old url already replaced or an unknown photo are ignored', async () => {
    const { clock, urls, failed } = setup();
    const first = await urls(['a']);

    expect(failed('a', first.get('a') as string)).toBe(false);
    clock.now += PHOTO_URL_MIN_AGE_MS;
    expect(failed('a', first.get('a') as string)).toBe(true);
    expect(failed('a', first.get('a') as string)).toBe(false);
    const second = await urls(['a']);
    expect(failed('a', first.get('a') as string)).toBe(false);
    expect(failed('a', second.get('a') as string)).toBe(false);
    expect(failed('local-blob', 'blob:x')).toBe(false);
  });
});
