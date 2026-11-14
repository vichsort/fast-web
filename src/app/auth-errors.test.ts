import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js';
import { authErrorText } from './auth-errors';

describe('auth error texts', () => {
  it('tells wrong credentials, weak password and no connection apart', () => {
    expect(authErrorText(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))).toBe(
      'Email ou senha incorretos.',
    );
    expect(authErrorText(new AuthWeakPasswordError('weak', 422, ['length']))).toBe(
      'Senha fraca. Escolha uma senha mais longa.',
    );
    expect(authErrorText(new AuthRetryableFetchError('fetch failed', 0))).toBe(
      'Sem conexão. Conecte-se à internet para entrar.',
    );
    expect(authErrorText(new AuthApiError('boom', 500, 'unexpected_failure'))).toBe(
      'Não foi possível concluir. Tente de novo.',
    );
  });
});
