// Rotas (TanStack Router, definidas em código). A raiz decide a interface pelo papel (pages/gate.tsx).
// Cada área declara as suas rotas no próprio arquivo (technician/routes.tsx, office/routes.tsx, dev/routes.tsx).
import { createRoute, createRouter } from '@tanstack/react-router';
import { officeRouteTree } from '@/office/routes';
import { technicianRouteTree } from '@/technician/routes';
import { ForgotPasswordPage } from './pages/forgot-password';
import { Gate } from './pages/gate';
import { LoginPage } from './pages/login';
import { SetPasswordPage } from './pages/set-password';
import { rootRoute } from './root-route';

const gateRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Gate });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): { removed?: true } =>
    search.removed === true || search.removed === 'true' ? { removed: true } : {},
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
});

const setPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/set-password',
  component: SetPasswordPage,
});

const routeTree = rootRoute.addChildren([
  gateRoute,
  loginRoute,
  forgotPasswordRoute,
  setPasswordRoute,
  technicianRouteTree,
  officeRouteTree,
  // A vitrine só no dev, por import dinâmico: o build de produção nem gera o pedaço dela.
  ...(import.meta.env.DEV ? [(await import('./dev/routes')).devRouteTree] : []),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
