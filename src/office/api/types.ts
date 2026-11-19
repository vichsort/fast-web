// Contrato da API do escritório: a forma das funções dos dados de exemplo (../mocks.ts). A implementação real
// (./supabase.ts) tem de cumprir o mesmo tipo, então trocar a fonte de dados não muda nenhuma tela.
import type * as mock from '../mocks';

export type OfficeApi = Pick<
  typeof mock,
  | 'officeListOrders'
  | 'officeGetOrder'
  | 'officeDashboard'
  | 'officeLateSupplements'
  | 'officeListClients'
  | 'officeGetClient'
  | 'officeListMembers'
  | 'officeTechnicians'
  | 'officeAudit'
  | 'officeCompany'
  | 'officeSessionUser'
  | 'createOrder'
  | 'updateOrder'
  | 'setAssignees'
  | 'updateMaterials'
  | 'cancelOrder'
  | 'reviewExecution'
  | 'acknowledgeSupplements'
  | 'createClient'
  | 'updateClient'
  | 'addAddress'
  | 'updateAddress'
  | 'setPrimaryAddress'
  | 'deleteAddress'
  | 'deleteClient'
  | 'updateCompany'
  | 'inviteMember'
  | 'updateMemberRole'
  | 'removeMember'
  | 'updateProfile'
>;
