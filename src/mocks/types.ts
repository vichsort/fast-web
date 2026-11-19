// Formas dos dados de exemplo: as linhas do banco (database.types.ts) e as "views" que as telas leem, no formato
// que as consultas reais vão devolver (select com relações embutidas). Trocar o mock pela integração não muda a tela.
import type { Tables } from '@/lib/database.types';
import type { OrderPriority, OrderStatus, ServiceType } from '@/lib/enums';
import type { ExecutionAlert, PhotoAlert } from '@/photos/alerts';

export type Company = Tables<'companies'>;
export type Profile = Tables<'profiles'>;
export type CompanyMember = Tables<'company_members'>;
export type Client = Tables<'clients'>;
export type ClientAddress = Omit<Tables<'client_addresses'>, 'format_address'>;
export type ServiceOrder = Omit<Tables<'service_orders'>, 'ensure_order_editable'>;
export type Assignment = Tables<'service_order_assignees'>;
export type Execution = Tables<'service_order_executions'>;
export type Photo = Tables<'service_order_photos'>;
export type HistoryEvent = Tables<'service_order_history'>;
export type AuditLog = Tables<'audit_logs'>;

/** Pessoa referenciada (autor, técnico, participante). */
export interface PersonRef {
  id: string;
  full_name: string;
}

/** Linha das listas de O.S. (celular e escritório). */
export interface OrderListItem extends ServiceOrder {
  client: Pick<Client, 'id' | 'name' | 'phone' | 'deleted_at'>;
  /** Técnicos com atribuição ativa. Vazio = "sem técnico". */
  assignees: PersonRef[];
  /** 03, R6: prazo vencido em open, in_progress ou rejected. */
  overdue: boolean;
  /** Complementos tardios ainda sem ciência (04, R11). */
  late_supplements_unseen: number;
}

/** Linha da lista de O.S. do escritório: só o que a tabela mostra e os filtros usam (docs/e2e.md, D4). */
export interface OfficeOrderListItem
  extends Pick<
    ServiceOrder,
    'id' | 'order_number' | 'title' | 'status' | 'priority' | 'service_type' | 'due_at' | 'client_id'
  > {
  client: Pick<Client, 'id' | 'name'>;
  /** Técnicos com atribuição ativa. Vazio = "sem técnico". */
  assignees: PersonRef[];
  /** 03, R6: prazo vencido em open, in_progress ou rejected. */
  overdue: boolean;
  /** Complementos tardios ainda sem ciência (04, R11). */
  late_supplements_unseen: number;
}

export interface PhotoView extends Photo {
  /** URL para exibir (no real, assinada por get_photo_urls; aqui, um SVG local). */
  url: string;
  /** Alertas calculados no front (src/photos/alerts.ts). */
  alerts: PhotoAlert[];
}

export interface ExecutionView extends Execution {
  submitter: PersonRef;
  participant_refs: PersonRef[];
  reviewer: PersonRef | null;
  acknowledger: PersonRef | null;
  photos: PhotoView[];
  /** Só nas tentativas principais. */
  alerts: ExecutionAlert[];
}

/** Tentativa principal com os complementos dela, em ordem de chegada. */
export interface AttemptView extends ExecutionView {
  /** 1, 2, 3… na ordem de chegada. */
  attempt_number: number;
  supplements: ExecutionView[];
}

export interface AssignmentView extends Assignment {
  user: PersonRef;
}

export interface HistoryView extends HistoryEvent {
  actor: PersonRef | null;
}

export interface OrderDetail extends OrderListItem {
  client: Client;
  client_address: ClientAddress | null;
  /** Todas as atribuições, inclusive as fechadas (03, R8). */
  assignments: AssignmentView[];
  attempts: AttemptView[];
  history: HistoryView[];
  created_by_ref: PersonRef;
}

/** Saída de get_dashboard (05). */
export interface DashboardCounts {
  open: number;
  unassigned: number;
  in_progress: number;
  pending_approval: number;
  rejected: number;
  overdue: number;
  approved_this_month: number;
  late_supplements_unseen: number;
}

export interface LateSupplementItem {
  order: OrderListItem;
  supplement: ExecutionView;
}

export interface ClientListItem extends Client {
  primary_address: ClientAddress | null;
  address_count: number;
  /** O.S. que não estão approved nem cancelled (02, R7). */
  open_orders: number;
}

export interface ClientDetail extends Client {
  addresses: ClientAddress[];
  orders: OfficeOrderListItem[];
}

export interface MemberView extends CompanyMember {
  profile: Profile;
}

export interface AuditView extends AuditLog {
  actor: PersonRef | null;
  /** Nome de quem a ação atingiu (membro) ou da empresa. */
  target_name: string;
}

/** Item da tela de Pendências do técnico (docs/queue.md): uma forma só para fila, recusas e bloqueados. */
export interface PendingItem {
  id: string;
  kind: 'start' | 'submit' | 'supplement' | 'materials';
  /** sending: no ar agora; waiting: espera crescente sem rede; queued: atrás de outro item; refused: recusado
   *  por regra (com o código); blocked: erro de bug, pausado até ação. */
  state: 'sending' | 'waiting' | 'queued' | 'refused' | 'blocked';
  order_id: string;
  order_number: number;
  order_title: string;
  created_at: string;
  next_attempt_at: string | null;
  /** Código do catálogo (errors.md) quando recusado. */
  refusal: string | null;
  /** Erro técnico quando bloqueado. */
  error: string | null;
  photos: { done: number; total: number } | null;
}

export interface SyncState {
  last_sync_at: string | null;
  pending: number;
  blocked: number;
  online: boolean;
  syncing: boolean;
  needs_login: boolean;
}

export interface OrderFilters {
  search?: string;
  status?: OrderStatus[];
  priority?: OrderPriority[];
  service_type?: ServiceType[];
  technician_id?: string | null;
  client_id?: string | null;
  /** Prazo entre as datas (AAAA-MM-DD, inclusive), no fuso da empresa. */
  due_from?: string | null;
  due_to?: string | null;
  overdue?: boolean;
  unassigned?: boolean;
}
