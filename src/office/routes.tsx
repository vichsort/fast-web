// Rotas da interface do escritório (só esta área mexe aqui). Mapa das telas: docs/screens-office.md.
import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { rootRoute } from '@/app/root-route';
import { parseOrdersSearch } from './orders/search';

/** Tela do pedaço do escritório (pages.ts), carregada na primeira visita a uma rota da área. */
const page = (name: keyof typeof import('./pages')) => lazyRouteComponent(() => import('./pages'), name);

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

export const officeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/office',
  component: page('OfficeLayout'),
});

const child = { getParentRoute: () => officeRoute } as const;

const dashboardRoute = createRoute({ ...child, path: '/', component: page('DashboardPage') });

const ordersRoute = createRoute({
  ...child,
  path: 'orders',
  component: page('OrdersPage'),
  validateSearch: parseOrdersSearch,
});
const orderNewRoute = createRoute({
  ...child,
  path: 'orders/new',
  component: page('OrderNewPage'),
  validateSearch: (search: Record<string, unknown>): { client?: string } => ({ client: text(search.client) }),
});
const orderRoute = createRoute({ ...child, path: 'orders/$orderId', component: page('OrderDetailPage') });
const orderEditRoute = createRoute({ ...child, path: 'orders/$orderId/edit', component: page('OrderEditPage') });

const reviewRoute = createRoute({
  ...child,
  path: 'review',
  component: page('ReviewQueuePage'),
  validateSearch: (search: Record<string, unknown>): { tab?: 'late' } => (search.tab === 'late' ? { tab: 'late' } : {}),
});
const reviewOrderRoute = createRoute({ ...child, path: 'review/$orderId', component: page('ReviewOrderPage') });

const clientsRoute = createRoute({
  ...child,
  path: 'clients',
  component: page('ClientsPage'),
  validateSearch: (search: Record<string, unknown>): { q?: string; deleted?: true } => ({
    q: text(search.q),
    deleted: search.deleted === true || search.deleted === 'true' ? true : undefined,
  }),
});
const clientRoute = createRoute({ ...child, path: 'clients/$clientId', component: page('ClientDetailPage') });

const companyRoute = createRoute({ ...child, path: 'company', component: page('CompanyPage') });
const membersRoute = createRoute({ ...child, path: 'members', component: page('MembersPage') });
const auditRoute = createRoute({ ...child, path: 'audit', component: page('AuditPage') });
const profileRoute = createRoute({ ...child, path: 'profile', component: page('ProfilePage') });

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
