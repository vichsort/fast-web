// Endereço do cliente no formulário (02: formato de endereço): o rascunho em texto, a conversão para a API e o schema
// com os obrigatórios (R2: rua, cidade e UF). Um lugar só para o diálogo de endereço e o cadastro completo do cliente.
import { z } from 'zod';
import { formatZipCode } from '@/lib/format';
import { requiredText } from '@/lib/forms';
import { t } from '@/lib/i18n';
import type { ClientAddress } from '@/lib/views';
import type { AddressInput } from '../api/types';

export type AddressDraft = Record<keyof AddressInput, string>;

export const emptyAddress: AddressDraft = {
  label: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  reference: '',
};

export const draftFromAddress = (a: ClientAddress): AddressDraft => ({
  label: a.label ?? '',
  zip_code: a.zip_code ? formatZipCode(a.zip_code) : '',
  street: a.street,
  number: a.number ?? '',
  complement: a.complement ?? '',
  district: a.district ?? '',
  city: a.city,
  state: a.state,
  reference: a.reference ?? '',
});

export const draftToInput = (d: AddressDraft): AddressInput => ({
  label: d.label || null,
  zip_code: d.zip_code || null,
  street: d.street,
  number: d.number || null,
  complement: d.complement || null,
  district: d.district || null,
  city: d.city,
  state: d.state,
  reference: d.reference || null,
});

const required = requiredText(t('office.common.fieldRequired'));

export const addressSchema = z.object({
  label: z.string(),
  zip_code: z.string(),
  street: required,
  number: z.string(),
  complement: z.string(),
  district: z.string(),
  city: required,
  state: required,
  reference: z.string(),
}) satisfies z.ZodType<AddressDraft>;

/** Mensagem de cada campo com problema (vazio quando o endereço vale). */
export function addressErrors(draft: AddressDraft): Partial<Record<keyof AddressDraft, string>> {
  const result = addressSchema.safeParse(draft);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
}
