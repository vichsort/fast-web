// Rotas da interface do escritório (só esta área mexe aqui). Mapa das telas: docs/screens-office.md.
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '@/app/root-route';
import { AuditPage } from './admin/audit';
import { CompanyPage } from './admin/company';
import { MembersPage } from './admin/members';
import { ClientDetailPage } from './clients/detail';
import { ClientsPage } from './clients/list';
import { DashboardPage } from './dashboard';
import { OfficeLayout } from './layout';
import { OrderDetailPage } from './orders/detail';
import { OrderEditPage, OrderNewPage } from './orders/form';
import { OrdersPage, parseOrdersSearch } from './orders/list';
import { ProfilePage } from './profile';
import { ReviewQueuePage } from './review/queue';
import { ReviewOrderPage } from './review/review';

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

export const officeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/office', component: OfficeLayout });

const child = { getParentRoute: () => officeRoute } as const;

const dashboardRoute = createRoute({ ...child, path: '/', component: DashboardPage });

const ordersRoute = createRoute({ ...child, path: 'orders', component: OrdersPage, validateSearch: parseOrdersSearch });
const orderNewRoute = createRoute({
  ...child,
  path: 'orders/new',
  component: OrderNewPage,
  validateSearch: (search: Record<string, unknown>): { client?: string } => ({ client: text(search.client) }),
});
const orderRoute = createRoute({ ...child, path: 'orders/$orderId', component: OrderDetailPage });
const orderEditRoute = createRoute({ ...child, path: 'orders/$orderId/edit', component: OrderEditPage });

const reviewRoute = createRoute({
  ...child,
  path: 'review',
  component: ReviewQueuePage,
  validateSearch: (search: Record<string, unknown>): { tab?: 'late' } => (search.tab === 'late' ? { tab: 'late' } : {}),
});
const reviewOrderRoute = createRoute({ ...child, path: 'review/$orderId', component: ReviewOrderPage });

const clientsRoute = createRoute({
  ...child,
  path: 'clients',
  component: ClientsPage,
  validateSearch: (search: Record<string, unknown>): { q?: string; deleted?: true } => ({
    q: text(search.q),
    deleted: search.deleted === true || search.deleted === 'true' ? true : undefined,
  }),
});
const clientRoute = createRoute({ ...child, path: 'clients/$clientId', component: ClientDetailPage });

const companyRoute = createRoute({ ...child, path: 'company', component: CompanyPage });
const membersRoute = createRoute({ ...child, path: 'members', component: MembersPage });
const auditRoute = createRoute({ ...child, path: 'audit', component: AuditPage });
const profileRoute = createRoute({ ...child, path: 'profile', component: ProfilePage });

export const officeRouteTree = officeRoute.addChildren([
  dashboardRoute,
  ordersRoute,
  orderNewRoute,
  orderRoute,
  orderEditRoute,
  reviewRoute,
  reviewOrderRoute,
  clientsRoute,
  clientRoute,
  companyRoute,
  membersRoute,
  auditRoute,
  profileRoute,
]);
