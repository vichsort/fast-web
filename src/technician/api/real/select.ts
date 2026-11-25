// O que as telas do técnico leem de uma O.S., coluna por coluna, no formato de `OrderRow` (src/lib/order-detail.ts): a
// leitura vai para o cache do aparelho, que guarda só as colunas usadas (../fast/docs/offline.md). Sem o histórico, que
// o técnico não vê. As observações do cliente ficam: são para o campo.
import { PERSON } from '@/lib/orders-query';

export const TECHNICIAN_ORDER_SELECT = `id, order_number, title, status, priority, service_type, due_at, address,
  instructions, materials_notes, cancel_reason, updated_at,
  client:clients!service_orders_client_id_fkey(id, name, phone, notes),
  assignments:service_order_assignees(user_id, unassigned_at, user:profiles!service_order_assignees_user_id_fkey(${PERSON})),
  executions:service_order_executions(id, supplements_execution_id, participants, description, client_started_at,
    client_submitted_at, received_at, converted_to_supplement, is_late, acknowledged_at, review_status, review_comment,
    reviewed_at,
    submitter:profiles!service_order_executions_submitted_by_fkey(${PERSON}),
    reviewer:profiles!service_order_executions_reviewed_by_fkey(${PERSON}),
    acknowledger:profiles!service_order_executions_acknowledged_by_fkey(${PERSON}),
    photos:service_order_photos(id, source, captured_at, uploaded_at, latitude, accuracy_m))`;
