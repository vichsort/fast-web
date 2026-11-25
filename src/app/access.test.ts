import { accessFrom, cacheableAccess, resolveAccess } from './access';

const technician = { companyId: 'c1', role: 'technician' as const };
const manager = { companyId: 'c1', role: 'manager' as const };

describe('access', () => {
  it('opens the technician interface for a technician and the office one for owner and manager', () => {
    expect(accessFrom([technician], false)).toEqual({ kind: 'technician', companyId: 'c1', role: 'technician' });
    expect(accessFrom([manager], false)).toEqual({ kind: 'office', companyId: 'c1', role: 'manager' });
    expect(accessFrom([{ companyId: 'c1', role: 'owner' }], false)).toMatchObject({ kind: 'office', role: 'owner' });
  });

  it('uses the oldest membership when the user is in more than one company', () => {
    expect(accessFrom([manager, { companyId: 'c2', role: 'technician' }], false)).toMatchObject({ companyId: 'c1' });
  });

  it('without an active membership: no access, except the platform admin, who has no interface in the MVP', () => {
    expect(accessFrom([], false)).toEqual({ kind: 'no_access' });
    expect(accessFrom([], true)).toEqual({ kind: 'platform_admin' });
  });

  it('without an accepted membership but with a pending invite: shows the invite (06, R10)', () => {
    const invite = { memberId: 'm1', companyName: 'Fast', role: 'technician' as const };
    expect(accessFrom([], false, [invite])).toEqual({ kind: 'invited', invites: [invite] });
    expect(accessFrom([], true, [invite])).toEqual({ kind: 'invited', invites: [invite] });
    expect(accessFrom([technician], false, [invite])).toMatchObject({ kind: 'technician' });
  });

  it('never keeps an invite on the device: offline, it is not shown, and it may be gone', () => {
    expect(cacheableAccess({ kind: 'invited', invites: [] })).toBe(false);
    expect(cacheableAccess({ kind: 'technician', companyId: 'c1', role: 'technician' })).toBe(true);
    expect(cacheableAccess({ kind: 'no_access' })).toBe(true);
  });

  it('offline: keeps the last known access instead of treating the user as removed', () => {
    const cached = { kind: 'technician', companyId: 'c1', role: 'technician' } as const;
    expect(resolveAccess({ ok: false, errorClass: 'network' }, cached)).toEqual(cached);
    expect(resolveAccess({ ok: false, errorClass: 'server' }, cached)).toEqual(cached);
    expect(resolveAccess({ ok: false, errorClass: 'network' }, null)).toEqual({ kind: 'offline_first_access' });
  });

  it('online: the server answer wins over the cache, including a removal', () => {
    const cached = { kind: 'technician', companyId: 'c1', role: 'technician' } as const;
    expect(resolveAccess({ ok: true, memberships: [], isPlatformAdmin: false, invites: [] }, cached)).toEqual({
      kind: 'no_access',
    });
    expect(
      resolveAccess({ ok: true, memberships: [manager], isPlatformAdmin: false, invites: [] }, cached),
    ).toMatchObject({
      kind: 'office',
    });
  });
});
