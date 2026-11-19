// Telas do escritório num pedaço só do build: as rotas (routes.tsx) carregam daqui sob demanda, então o técnico e o
// login não baixam o escritório.
export { AuditPage } from './admin/audit';
export { CompanyPage } from './admin/company';
export { MembersPage } from './admin/members';
export { ClientDetailPage } from './clients/detail';
export { ClientsPage } from './clients/list';
export { DashboardPage } from './dashboard';
export { OfficeLayout } from './layout';
export { OrderDetailPage } from './orders/detail';
export { OrderEditPage, OrderNewPage } from './orders/form';
export { OrdersPage } from './orders/list';
export { ProfilePage } from './profile';
export { ReviewQueuePage } from './review/queue';
export { ReviewOrderPage } from './review/review';
