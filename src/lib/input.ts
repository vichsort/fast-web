// O que o usuário digitou, normalizado antes de ir ao banco (as duas interfaces e os dados de exemplo).

/** Texto aparado; vazio ou só espaços vira `null` (o banco guarda ausência como `null`). */
export const blankToNull = (value: string | null | undefined): string | null =>
  value && value.trim() !== '' ? value.trim() : null;

/** Telefone sem a máscara, só os dígitos (a busca e o link do WhatsApp comparam dígitos). */
export const phoneDigits = (value: string): string => value.replace(/\D/g, '');

/** Telefone como vai ao banco: só os dígitos; sem nenhum dígito, `null`. */
export const phoneDigitsOrNull = (value: string | null | undefined): string | null =>
  blankToNull(value == null ? null : phoneDigits(value));
