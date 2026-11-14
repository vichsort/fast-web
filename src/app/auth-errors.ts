// Texto da tela para um erro do Supabase Auth (login, recuperar e definir senha).
import { type AuthError, isAuthRetryableFetchError, isAuthWeakPasswordError } from '@supabase/supabase-js';
import { t } from '@/lib/i18n';

export function authErrorText(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) return t('auth.offline');
  if (isAuthWeakPasswordError(error) || error.code === 'weak_password') return t('auth.weakPassword');
  if (error.code === 'invalid_credentials') return t('auth.invalidCredentials');
  return t('auth.failed');
}
