// Parâmetros do `update_order` (03) a partir da edição: materiais só com `p_update_materials` (omitir e mandar `null`
// têm o mesmo efeito, por isso a flag), técnicos só com a lista. Texto vazio vai omitido, que o banco lê como `null`.
import type { Database } from '@/lib/database.types';
import { blankToNull } from '@/lib/input';
import type { OrderEdit } from './types';

type Args = Database['public']['Functions']['update_order']['Args'];

export function updateOrderArgs(id: string, edit: OrderEdit): Args {
  const args: Args = {
    p_order_id: id,
    p_title: edit.title,
    p_instructions: blankToNull(edit.instructions) ?? undefined,
    p_priority: edit.priority,
    p_due_date: edit.due_date ?? undefined,
    p_service_type: edit.service_type,
    p_client_address_id: edit.client_address_id ?? undefined,
  };
  if (edit.materials) {
    args.p_update_materials = true;
    args.p_materials_notes = blankToNull(edit.materials.text) ?? undefined;
    args.p_materials_expected = blankToNull(edit.materials.expected) ?? undefined;
  }
  if (edit.assignee_ids) args.p_assignee_ids = edit.assignee_ids;
  return args;
}
