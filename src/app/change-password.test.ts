import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { t } from '@/lib/i18n';
import { changePassword, type PasswordAuth } from './change-password';

function fakeAuth(signInError: Error | null = null, updateError: Error | null = null) {
  const calls: string[] = [];
  const auth: PasswordAuth = {
    signInWithPassword: async ({ password }) => {
      calls.push(`signIn:${password}`);
      return { error: signInError } as Awaited<ReturnType<PasswordAuth['signInWithPassword']>>;
    },
    updateUser: async ({ password }) => {
      calls.push(`update:${password}`);
      return { error: updateError } as Awaited<ReturnType<PasswordAuth['updateUser']>>;
    },
  };
  return { auth, calls };
}

describe('change password (01, secure_password_change)', () => {
  it('signs in again with the current password, then changes it: the fresh login is what the Auth asks for', async () => {
    const { auth, calls } = fakeAuth();
    expect(await changePassword(auth, 'a@fast.test', 'atual', 'nova-senha')).toEqual({ ok: true });
    expect(calls).toEqual(['signIn:atual', 'update:nova-senha']);
  });

  it('a wrong current password changes nothing and points at that field', async () => {
    const { auth, calls } = fakeAuth(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'));
    expect(await changePassword(auth, 'a@fast.test', 'errada', 'nova-senha')).toEqual({
      ok: false,
      field: 'current',
      message: t('auth.wrongCurrentPassword'),
    });
    expect(calls).toEqual(['signIn:errada']);
  });

  it('the same password again points at the new one', async () => {
    const { auth } = fakeAuth(null, new AuthApiError('same', 422, 'same_password'));
    expect(await changePassword(auth, 'a@fast.test', 'atual', 'atual')).toMatchObject({
      ok: false,
      field: 'next',
      message: t('auth.samePassword'),
    });
  });

  it('without connection, says so', async () => {
    const { auth } = fakeAuth(new AuthRetryableFetchError('fetch failed', 0));
    expect(await changePassword(auth, 'a@fast.test', 'atual', 'nova-senha')).toEqual({
      ok: false,
      field: null,
      message: t('auth.offline'),
    });
  });
});
