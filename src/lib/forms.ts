// Peças dos schemas Zod dos formulários (React Hook Form + Zod): só o que a tela confere antes de enviar
// (obrigatório, formato). Regra de negócio fica no banco.
import { z } from 'zod';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Texto obrigatório: vazio ou só espaços é recusado. O valor segue como digitado; o envio normaliza. */
export const requiredText = (message: string) => z.string().refine((value) => value.trim() !== '', message);

/** Email no formato `a@b.c`; espaços nas pontas não contam. */
export const emailText = (message: string) => z.string().refine((value) => EMAIL.test(value.trim()), message);

/** Escolha obrigatória (combobox, cartões): o campo começa em `null`, que é recusado; a saída já vem sem `null`. */
export function requiredChoice<T extends z.ZodType>(schema: T, message: string) {
  return schema.nullable().transform((value, ctx): z.output<T> => {
    if (value === null) {
      ctx.addIssue({ code: 'custom', message });
      return z.NEVER;
    }
    return value;
  });
}
