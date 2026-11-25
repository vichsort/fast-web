// Links do convite e da recuperação de senha (06 do backend, R12 a R14): sem login, pelo token do link. A falha vira
// `ApiError` classificada (`invalid_link` quando o link não vale).
import { invokeFunction } from '@/lib/edge-functions';

export interface LinkInfo {
  kind: 'invite' | 'recovery';
  company_name: string;
  email: string;
  /** A pessoa define a senha aqui (recuperação e conta nova); senão, entra com a dela e aceita no app. */
  set_password: boolean;
}

export const openLink = (token: string) => invokeFunction<LinkInfo>('open_link', { token });

/** Gasta o link e grava a senha (no convite da conta nova, aceita); devolve o email para entrar. */
export const redeemLink = (token: string, password: string) =>
  invokeFunction<{ email: string }>('use_link', { token, password });
