import { ensurePersistentStorage } from './persistence';

describe('ensurePersistentStorage', () => {
  it('Q12: storage already persistent is not asked again', async () => {
    const persist = vi.fn();

    expect(await ensurePersistentStorage({ persisted: async () => true, persist })).toBe('persisted');
    expect(persist).not.toHaveBeenCalled();
  });

  it.each([
    [true, 'persisted'],
    [false, 'denied'],
  ] as const)('Q12: asks the browser to keep the storage; granted %s → %s', async (granted, result) => {
    expect(await ensurePersistentStorage({ persisted: async () => false, persist: async () => granted })).toBe(result);
  });

  it('Q12: a browser without the API is unsupported, and a failing request counts as denied', async () => {
    expect(await ensurePersistentStorage(null)).toBe('unsupported');
    expect(
      await ensurePersistentStorage({
        persisted: async () => false,
        persist: async () => {
          throw new Error('nope');
        },
      }),
    ).toBe('denied');
  });
});
