import { createAuthStorage } from './auth-storage';

describe('auth storage', () => {
  it('keeps the Supabase session in IndexedDB, where the page and the service worker read the same value', async () => {
    const name = `auth-${crypto.randomUUID()}`;
    const page = createAuthStorage(name);
    const worker = createAuthStorage(name);

    expect(await page.getItem('sb-session')).toBeNull();
    await page.setItem('sb-session', '{"access_token":"a"}');
    expect(await worker.getItem('sb-session')).toBe('{"access_token":"a"}');

    await worker.removeItem('sb-session');
    expect(await page.getItem('sb-session')).toBeNull();
  });
});
