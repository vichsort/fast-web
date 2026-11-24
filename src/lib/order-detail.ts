// Montagem da O.S. como as telas leem (escritório e técnico), a partir da linha de `service_orders` com as relações
// embutidas (ORDER_SELECT em src/lib/orders-query.ts). Vale para os dados reais e para os de exemplo.
import { OVERDUE_STATUSES } from '@/lib/enums';
import type {
  Assignment,
  AttemptView,
  Client,
  ClientAddress,
  Execution,
  ExecutionView,
  HistoryEvent,
  OrderDetail,
  PersonRef,
  Photo,
  ServiceOrder,
} from '@/lib/views';
import { executionAlerts, photoAlerts } from '@/photos/alerts';

export interface ExecutionRow extends Execution {
  submitter: PersonRef;
  reviewer: PersonRef | null;
  acknowledger: PersonRef | null;
  photos: Photo[];
}

/** Linha de `service_orders` com o que as telas embutem (ORDER_SELECT em src/lib/orders-query.ts). */
export interface OrderRow extends ServiceOrder {
  client: Client;
  client_address: ClientAddress | null;
  created_by_ref: PersonRef;
  assignments: (Assignment & { user: PersonRef })[];
  executions: ExecutionRow[];
  /** Só no detalhe. */
  history?: (HistoryEvent & { actor: PersonRef | null })[];
}

/** 03, R6: prazo vencido em open, in_progress ou rejected. */
export function isOverdue(o: Pick<ServiceOrder, 'due_at' | 'status'>, now: number): boolean {
  return o.due_at !== null && Date.parse(o.due_at) < now && OVERDUE_STATUSES.includes(o.status);
}

const byReceived = (a: { received_at: string }, b: { received_at: string }) =>
  Date.parse(a.received_at) - Date.parse(b.received_at);

/** O.S. montada como as telas leem. `photoUrls`: URLs assinadas por foto (get_photo_urls); sem ela, `url` vazia. */
export function toOrderDetail(row: OrderRow, now: number, photoUrls: Map<string, string> = new Map()): OrderDetail {
  const { executions, history, ...order } = row;
  const people = new Map(row.assignments.map((a) => [a.user.id, a.user]));
  const person = (id: string): PersonRef => people.get(id) ?? { id, full_name: '—' };

  const own = [...executions].sort(byReceived);
  const attempts = own.filter((e) => e.supplements_execution_id === null);
  const view = (e: ExecutionRow, isAttempt: boolean): ExecutionView => ({
    ...e,
    participant_refs: e.participants.map(person),
    photos: [...e.photos]
      .sort((a, b) => Date.parse(a.uploaded_at) - Date.parse(b.uploaded_at))
      .map((p) => ({
        ...p,
        url: photoUrls.get(p.id) ?? '',
        alerts: photoAlerts({ source: p.source, capturedAt: p.captured_at }, { clientStartedAt: e.client_started_at }),
      })),
    alerts: isAttempt
      ? executionAlerts(
          { clientSubmittedAt: e.client_submitted_at, receivedAt: e.received_at },
          { dueAt: row.due_at },
          attempts
            .filter((a) => a.id !== e.id)
            .map((a) => ({ reviewStatus: a.review_status, reviewedAt: a.reviewed_at })),
        )
      : [],
  });
  const attemptViews: AttemptView[] = attempts.map((a, index) => ({
    ...view(a, true),
    attempt_number: index + 1,
    supplements: own.filter((s) => s.supplements_execution_id === a.id).map((s) => view(s, false)),
  }));

  return {
    ...order,
    assignees: row.assignments.filter((a) => a.unassigned_at === null).map((a) => a.user),
    overdue: isOverdue(row, now),
    late_supplements_unseen: own.filter((e) => e.is_late && e.acknowledged_at === null).length,
    attempts: attemptViews,
    // O nome guardado no evento (03): renomear o perfil depois não reescreve o histórico.
    history: [...(history ?? [])]
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .map((h) => ({ ...h, actor: h.actor && { ...h.actor, full_name: h.actor_name ?? h.actor.full_name } })),
  };
}
