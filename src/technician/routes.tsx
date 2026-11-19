// Rotas da interface do técnico (só esta área mexe aqui). Mapa das telas: docs/screens-technician.md.
import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { rootRoute } from '@/app/root-route';

/** Tela do pedaço do técnico (pages.ts), carregada na primeira visita a uma rota da área. */
const page = (name: keyof typeof import('./pages')) => lazyRouteComponent(() => import('./pages'), name);

export const technicianRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/technician',
  component: page('TechnicianLayout'),
});
const ordersRoute = createRoute({ getParentRoute: () => technicianRoute, path: '/', component: page('OrdersPage') });
export const orderRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/orders/$orderId',
  component: page('OrderDetailPage'),
});
export const executionRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/orders/$orderId/execution',
  component: page('ExecutionPage'),
});
export const supplementRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/orders/$orderId/supplement',
  component: page('SupplementPage'),
  validateSearch: (search: Record<string, unknown>): { attempt?: string } =>
    typeof search.attempt === 'string' ? { attempt: search.attempt } : {},
});
const pendingRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/pending',
  component: page('PendingPage'),
});
const profileRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/profile',
  component: page('ProfilePage'),
});

export const technicianRouteTree = technicianRoute.addChildren([
  ordersRoute,
  orderRoute,
  executionRoute,
  supplementRoute,
  pendingRoute,
  profileRoute,
]);
