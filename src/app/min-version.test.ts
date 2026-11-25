import { autoUpdateOnce } from './min-version';

function memoryStorage() {
  const items = new Map<string, string>();
  return { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => void items.set(k, v) };
}

describe('below the minimum version', () => {
  it('updates by itself once per version and session, then leaves the button: no reload loop', () => {
    const storage = memoryStorage();
    expect(autoUpdateOnce(storage, '0.3.0+abc')).toBe(true);
    expect(autoUpdateOnce(storage, '0.3.0+abc')).toBe(false);
    // Atualizou, mas a versão nova ainda está abaixo: tenta de novo uma vez.
    expect(autoUpdateOnce(storage, '0.4.0+def')).toBe(true);
  });

  it('without session storage, does not try: the button is there', () => {
    expect(autoUpdateOnce(null, '0.3.0')).toBe(false);
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    };
    expect(autoUpdateOnce(broken, '0.3.0')).toBe(false);
  });
});
