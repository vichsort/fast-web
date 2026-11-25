// Trocar a senha (01 do backend): com `secure_password_change`, o Auth só troca a senha de quem entrou há pouco, e o
// sistema não manda o código por email. O app entra de novo com a senha atual (que também a confere) e então troca.
import type { SupabaseClient } from '@supabase/supabase-js';
import { t } from '@/lib/i18n';
import { authErrorText } from './auth-errors';

export type PasswordAuth = Pick<SupabaseClient['auth'], 'signInWithPassword' | 'updateUser'>;

export type ChangePasswordResult = { ok: true } | { ok: false; field: 'current' | 'next' | null; message: string };

export async function changePassword(
  auth: PasswordAuth,
  email: string,
  current: string,
  next: string,
): Promise<ChangePasswordResult> {
  const signIn = await auth.signInWithPassword({ email, password: current });
  if (signIn.error) {
    if (signIn.error.code === 'invalid_credentials') {
      return { ok: false, field: 'current', message: t('auth.wrongCurrentPassword') };
    }
    return { ok: false, field: null, message: authErrorText(signIn.error) };
  }
  const update = await auth.updateUser({ password: next });
  if (update.error) {
    if (update.error.code === 'same_password') return { ok: false, field: 'next', message: t('auth.samePassword') };
    const message = authErrorText(update.error);
    return { ok: false, field: message === t('auth.weakPassword') ? 'next' : null, message };
  }
  return { ok: true };
}
