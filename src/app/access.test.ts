import { accessFrom, authLinkError, authLinkType, resolveAccess } from './access';

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

  it('offline: keeps the last known access instead of treating the user as removed', () => {
    const cached = { kind: 'technician', companyId: 'c1', role: 'technician' } as const;
    expect(resolveAccess({ ok: false, errorClass: 'network' }, cached)).toEqual(cached);
    expect(resolveAccess({ ok: false, errorClass: 'server' }, cached)).toEqual(cached);
    expect(resolveAccess({ ok: false, errorClass: 'network' }, null)).toEqual({ kind: 'offline_first_access' });
  });

  it('online: the server answer wins over the cache, including a removal', () => {
    const cached = { kind: 'technician', companyId: 'c1', role: 'technician' } as const;
    expect(resolveAccess({ ok: true, memberships: [], isPlatformAdmin: false }, cached)).toEqual({ kind: 'no_access' });
    expect(resolveAccess({ ok: true, memberships: [manager], isPlatformAdmin: false }, cached)).toMatchObject({
      kind: 'office',
    });
  });

  it('reads the type of an Auth email link from the URL hash', () => {
    expect(authLinkType('#access_token=x&refresh_token=y&type=invite')).toBe('invite');
    expect(authLinkType('#access_token=x&type=recovery')).toBe('recovery');
    expect(authLinkType('#type=signup')).toBeNull();
    expect(authLinkType('')).toBeNull();
  });

  it('tells an expired or already used Auth email link apart from a normal opening', () => {
    expect(authLinkError('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid')).toBe(
      true,
    );
    expect(authLinkError('#access_token=x&type=recovery')).toBe(false);
    expect(authLinkError('')).toBe(false);
  });
});
