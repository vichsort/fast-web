// Rotas da interface do técnico (só esta área mexe aqui). Mapa das telas: docs/screens-technician.md.
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '@/app/root-route';
import { ExecutionPage } from './execution-page';
import { TechnicianLayout } from './layout';
import { OrderDetailPage } from './order-detail-page';
import { OrdersPage } from './orders-page';
import { PendingPage } from './pending-page';
import { ProfilePage } from './profile-page';
import { SupplementPage } from './supplement-page';

export const technicianRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/technician',
  component: TechnicianLayout,
});
const ordersRoute = createRoute({ getParentRoute: () => technicianRoute, path: '/', component: OrdersPage });
export const orderRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/orders/$orderId',
  component: OrderDetailPage,
});
export const executionRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/orders/$orderId/execution',
  component: ExecutionPage,
});
export const supplementRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/orders/$orderId/supplement',
  component: SupplementPage,
  validateSearch: (search: Record<string, unknown>): { attempt?: string } =>
    typeof search.attempt === 'string' ? { attempt: search.attempt } : {},
});
const pendingRoute = createRoute({ getParentRoute: () => technicianRoute, path: '/pending', component: PendingPage });
const profileRoute = createRoute({ getParentRoute: () => technicianRoute, path: '/profile', component: ProfilePage });

export const technicianRouteTree = technicianRoute.addChildren([
  ordersRoute,
  orderRoute,
  executionRoute,
  supplementRoute,
  pendingRoute,
  profileRoute,
]);
