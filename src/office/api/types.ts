// Contrato da API do escritório: o que as telas leem e chamam. Duas implementações cumprem o mesmo tipo: a real
// (./supabase.ts) e os dados de exemplo (../mocks.ts). A escolha é em ./index.ts.
import type { MemberRole, OrderPriority, ServiceType } from '@/lib/enums';
import type {
  AuditView,
  Client,
  ClientAddress,
  ClientDetail,
  ClientListItem,
  Company,
  DashboardCounts,
  LateSupplementItem,
  MemberView,
  OfficeOrderListItem,
  OrderDetail,
  OrderFilters,
  PersonRef,
  Profile,
} from '@/lib/views';
import type { ZipLookup } from './viacep';

/** Campos da O.S. no formulário (create_order, update_order; 03). */
export interface OrderInput {
  client_id: string;
  client_address_id: string | null;
  service_type: ServiceType;
  title: string;
  instructions: string | null;
  priority: OrderPriority;
  /** AAAA-MM-DD (03, R5). */
  due_date: string | null;
  materials_notes: string | null;
  assignee_ids: string[];
}

/** Campos de um endereço do cliente (02). */
export interface AddressInput {
  label: string | null;
  zip_code: string | null;
  street: string;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string;
  state: string;
  reference: string | null;
}

export interface OfficeApi {
  // ---------------------------------------------------------------- leituras
  officeListOrders(filters?: OrderFilters): Promise<OfficeOrderListItem[]>;
  officePendingOrders(): Promise<OrderDetail[]>;
  officeGetOrder(id: string): Promise<OrderDetail | null>;
  officeDashboard(): Promise<DashboardCounts>;
  officeLateSupplements(): Promise<LateSupplementItem[]>;
  officeListClients(filters?: { search?: string; includeDeleted?: boolean }): Promise<ClientListItem[]>;
  officeGetClient(id: string): Promise<(ClientDetail & { open_orders: number }) | null>;
  officeListMembers(filters?: { includeRemoved?: boolean }): Promise<MemberView[]>;
  /** Técnicos ativos (para atribuir e filtrar). */
  officeTechnicians(): Promise<PersonRef[]>;
  /** Pessoas que o usuário enxerga, inclusive removidas, para mostrar nomes por id. */
  officePeople(): Promise<PersonRef[]>;
  officeAudit(): Promise<AuditView[]>;
  officeCompany(): Promise<Company>;
  officeSessionUser(role: 'owner' | 'manager'): Promise<Profile>;

  // ---------------------------------------------------------------- O.S. (03)
  createOrder(input: OrderInput & { id: string }, actor: PersonRef): Promise<{ id: string; order_number: number }>;
  updateOrder(
    id: string,
    input: Omit<OrderInput, 'client_id' | 'materials_notes' | 'assignee_ids'>,
    actor: PersonRef,
  ): Promise<void>;
  setAssignees(id: string, ids: string[], actor: PersonRef): Promise<void>;
  updateMaterials(id: string, text: string | null, expected: string | null, actor: PersonRef): Promise<void>;
  cancelOrder(id: string, reason: string, actor: PersonRef): Promise<void>;

  // ---------------------------------------------------------------- revisão (04)
  /** `simulateStale` só vale nos dados de exemplo: imita um complemento chegando depois do carregamento. */
  reviewExecution(
    input: {
      orderId: string;
      executionId: string;
      decision: 'approved' | 'rejected';
      comment: string | null;
      seenUntil: string | null;
      simulateStale?: boolean;
    },
    actor: PersonRef,
  ): Promise<void>;
  /** Devolve quantos complementos tardios ganharam ciência. */
  acknowledgeSupplements(orderId: string, until: string, actor: PersonRef): Promise<number>;

  // ---------------------------------------------------------------- clientes (02)
  createClient(input: {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
    address: AddressInput | null;
  }): Promise<{ client_id: string; address_id: string | null }>;
  updateClient(id: string, input: { name: string; phone: string | null; notes: string | null }): Promise<Client>;
  addAddress(target: { id: string; clientId: string }, input: AddressInput, makePrimary: boolean): Promise<string>;
  updateAddress(addressId: string, input: AddressInput): Promise<ClientAddress>;
  setPrimaryAddress(addressId: string): Promise<string>;
  deleteAddress(addressId: string, reason: string, actor: PersonRef): Promise<ClientAddress>;
  deleteClient(id: string, reason: string, actor: PersonRef): Promise<Client>;
  lookupZip(digits: string): Promise<ZipLookup>;

  // ---------------------------------------------------------------- empresa, membros e perfil (01, 06)
  updateCompany(
    input: Pick<Company, 'name' | 'document' | 'phone' | 'email' | 'timezone'>,
    actor: PersonRef,
  ): Promise<Company>;
  inviteMember(
    input: { email: string; full_name: string; role: MemberRole },
    actor: PersonRef,
  ): Promise<{ member: MemberView; reactivated: boolean; already: boolean }>;
  updateMemberRole(memberId: string, role: MemberRole, actor: PersonRef): Promise<{ closed_assignments: number }>;
  removeMember(memberId: string, reason: string, actor: PersonRef): Promise<{ closed_assignments: number }>;
  updateProfile(id: string, input: { full_name: string; phone: string | null }): Promise<Profile>;
}
