import { createQueryClient, forgetOnUserChange } from './query-client';

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

describe('forgetOnUserChange', () => {
  function cacheWithData() {
    const queryClient = createQueryClient();
    queryClient.setQueryData(['office', 'clients'], ['client of A']);
    queryClient.setQueryData(['technician', 'orders'], ['order of A']);
    return queryClient;
  }

  it('forgets every read when the user signs out', () => {
    const queryClient = cacheWithData();
    const sessionChanged = forgetOnUserChange(queryClient);
    sessionChanged('user-a');
    sessionChanged(null);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('forgets every read when another user signs in without a sign out in between', () => {
    const queryClient = cacheWithData();
    const sessionChanged = forgetOnUserChange(queryClient);
    sessionChanged('user-a');
    sessionChanged('user-b');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('keeps the reads while the same user stays (token refresh, first session read)', () => {
    const queryClient = cacheWithData();
    const sessionChanged = forgetOnUserChange(queryClient);
    sessionChanged('user-a');
    sessionChanged('user-a');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });
});
