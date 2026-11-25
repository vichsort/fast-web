import { onceInSession, reloadTarget } from './version-check';

function memoryStorage() {
  const items = new Map<string, string>();
  return { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => void items.set(k, v) };
}

describe('office: a new build on the server (decisions.md, Versão e atualização)', () => {
  it('reloads for a different version, also an older one (a rolled back deploy)', () => {
    expect(reloadTarget('0.3.0+def', '0.2.0+abc')).toBe('0.3.0+def');
    expect(reloadTarget('0.1.0+old', '0.2.0+abc')).toBe('0.1.0+old');
  });

  it('stays with the same version, or without an answer', () => {
    expect(reloadTarget('0.2.0+abc', '0.2.0+abc')).toBeNull();
    expect(reloadTarget(null, '0.2.0+abc')).toBeNull();
  });

  it('tries each thing once per session: a CDN still serving the old build does not reload forever', () => {
    const storage = memoryStorage();
    expect(onceInSession(storage, 'fast.reloadFor', '0.3.0')).toBe(true);
    expect(onceInSession(storage, 'fast.reloadFor', '0.3.0')).toBe(false);
    expect(onceInSession(storage, 'fast.reloadFor', '0.4.0')).toBe(true);
    expect(onceInSession(null, 'fast.reloadFor', '0.5.0')).toBe(false);
  });
});
