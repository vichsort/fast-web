// O que o formulário de edição manda ao `update_order` (03): os campos sempre; os materiais só se o usuário mudou o
// texto, com o texto que a tela tem como o do banco (`expected`, R11); os técnicos só se o conjunto mudou.
import type { OrderPriority, ServiceType } from '@/lib/enums';
import { blankToNull } from '@/lib/input';
import type { OrderEdit } from '../api';

/** Valor de "sem endereço" na escolha do endereço da O.S. */
export const NO_ADDRESS = 'none';

export interface OrderEditValues {
  address_id: string;
  service_type: ServiceType;
  title: string;
  instructions: string;
  priority: OrderPriority;
  /** AAAA-MM-DD. */
  due_date: string | null;
  materials: string;
  assignee_ids: string[];
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function orderEdit(
  loaded: { materials_notes: string | null; assignee_ids: string[] },
  values: OrderEditValues,
  expected: string | null,
): OrderEdit {
  const edit: OrderEdit = {
    client_address_id: values.address_id === NO_ADDRESS ? null : values.address_id,
    service_type: values.service_type,
    title: values.title,
    instructions: values.instructions,
    priority: values.priority,
    due_date: values.due_date,
  };
  if (blankToNull(values.materials) !== blankToNull(loaded.materials_notes)) {
    edit.materials = { text: values.materials, expected };
  }
  if (!sameSet(values.assignee_ids, loaded.assignee_ids)) edit.assignee_ids = values.assignee_ids;
  return edit;
}

/** Texto atual do banco num `conflict` (`details.current`, errors.md); `null` vira texto vazio. */
export function conflictCurrent(details: unknown): string {
  const current = (details as { current?: unknown } | null)?.current;
  return typeof current === 'string' ? current : '';
}
