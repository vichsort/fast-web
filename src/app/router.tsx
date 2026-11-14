// Rotas (TanStack Router, definidas em código). A raiz decide a interface pelo papel (pages/gate.tsx).
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { OfficeHome } from '@/office/home';
import { OfficeLayout } from '@/office/layout';
import { TechnicianHome } from '@/technician/home';
import { TechnicianLayout } from '@/technician/layout';
import { ForgotPasswordPage } from './pages/forgot-password';
import { Gate } from './pages/gate';
import { LoginPage } from './pages/login';
import { SetPasswordPage } from './pages/set-password';

const rootRoute = createRootRoute({ component: Outlet });

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

const technicianRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/technician',
  component: TechnicianLayout,
});
const technicianHomeRoute = createRoute({
  getParentRoute: () => technicianRoute,
  path: '/',
  component: TechnicianHome,
});

const officeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/office', component: OfficeLayout });
const officeHomeRoute = createRoute({ getParentRoute: () => officeRoute, path: '/', component: OfficeHome });

const routeTree = rootRoute.addChildren([
  gateRoute,
  loginRoute,
  forgotPasswordRoute,
  setPasswordRoute,
  technicianRoute.addChildren([technicianHomeRoute]),
  officeRoute.addChildren([officeHomeRoute]),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
