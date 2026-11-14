// t('grupo.chave', { param }) com chaves tipadas; '{param}' no texto é trocado pelo valor.
import { type ErrorCode, ptBR } from './pt-BR';

type Dictionary = typeof ptBR;
type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TextKey = Leaves<Dictionary>;

export function t(key: TextKey, params: Record<string, string | number> = {}): string {
  const text = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], ptBR);
  return (text as string).replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}

/** Texto de um código de erro (catálogo do backend ou do aparelho); código que o app ainda não conhece vira o genérico. */
export function errorMessage(code: string): string {
  return code in ptBR.errors ? ptBR.errors[code as ErrorCode] : ptBR.errors.unknown;
}

export type { ErrorCode };
