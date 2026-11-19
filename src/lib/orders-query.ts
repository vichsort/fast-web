// O que as telas embutem numa O.S. (escritório e técnico), no formato de `OrderRow` (src/office/derive.ts), e as URLs
// das fotos (get_photo_urls, 04). As duas áreas leem a mesma forma, para a montagem ser uma só.

export const PERSON = 'id, full_name';

/** O que as telas embutem numa O.S. (src/office/derive.ts, OrderRow). */
export const ORDER_SELECT = `*,
  client:clients!service_orders_client_id_fkey(*),
  client_address:client_addresses!service_orders_client_address_id_fkey(id, company_id, client_id, label, street, number, complement, district, city, state, zip_code, reference, is_primary, created_at, deleted_at, deleted_by, delete_reason),
  created_by_ref:profiles!service_orders_created_by_fkey(${PERSON}),
  assignments:service_order_assignees(*, user:profiles!service_order_assignees_user_id_fkey(${PERSON})),
  executions:service_order_executions(*,
    submitter:profiles!service_order_executions_submitted_by_fkey(${PERSON}),
    reviewer:profiles!service_order_executions_reviewed_by_fkey(${PERSON}),
    acknowledger:profiles!service_order_executions_acknowledged_by_fkey(${PERSON}),
    photos:service_order_photos(*))`;

export const HISTORY_SELECT = `history:service_order_history(*, actor:profiles!service_order_history_actor_id_fkey(${PERSON}))`;

const PHOTO_URL_BATCH = 100;

/** get_photo_urls (04): até 100 por chamada; a URL vale 5 minutos. `invoke` chama a Edge Function. */
export async function photoUrls(
  ids: string[],
  invoke: <T>(name: string, body: Record<string, unknown>) => Promise<T>,
): Promise<Map<string, string>> {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += PHOTO_URL_BATCH) batches.push(ids.slice(i, i + PHOTO_URL_BATCH));
  const results = await Promise.all(
    batches.map((photo_ids) => invoke<{ photo_id: string; url: string }[]>('get_photo_urls', { photo_ids })),
  );
  return new Map(results.flat().map((r) => [r.photo_id, r.url]));
}
