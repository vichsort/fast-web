import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  it('keeps office reads fresh for 30 s, still refetching on focus after that', () => {
    const options = createQueryClient().defaultQueryOptions({ queryKey: ['office', 'orders', {}] });
    expect(options.staleTime).toBe(30_000);
    expect(options.refetchOnWindowFocus).not.toBe(false);
  });

  it('leaves the technician reads stale at once, so the restored cache refreshes when the app opens with signal', () => {
    const options = createQueryClient().defaultQueryOptions({ queryKey: ['technician', 'orders'] });
    expect(options.staleTime ?? 0).toBe(0);
  });
});
