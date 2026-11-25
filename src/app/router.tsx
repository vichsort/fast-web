// Rotas (TanStack Router, definidas em código). A raiz decide a interface pelo papel (pages/gate.tsx).
// Cada área declara as suas rotas no próprio arquivo (technician/routes.tsx, office/routes.tsx, dev/routes.tsx).
import { createRoute, createRouter } from '@tanstack/react-router';
import { officeRouteTree } from '@/office/routes';
import { technicianRouteTree } from '@/technician/routes';
import { ForgotPasswordPage } from './pages/forgot-password';
import { Gate } from './pages/gate';
import { LinkPage } from './pages/link';
import { LoginPage } from './pages/login';
import { rootRoute } from './root-route';

const gateRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Gate });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): { removed?: true; declined?: true; email?: string } => ({
    ...(search.removed === true || search.removed === 'true' ? { removed: true as const } : {}),
    ...(search.declined === true || search.declined === 'true' ? { declined: true as const } : {}),
    // A página do link (convite de conta existente) manda o email já preenchido.
    ...(typeof search.email === 'string' ? { email: search.email } : {}),
  }),
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
});

// O link do convite e o de "definir senha" (06 do backend, R12 a R14), com o token no hash.
const linkRoute = createRoute({ getParentRoute: () => rootRoute, path: '/link', component: LinkPage });

const routeTree = rootRoute.addChildren([
  gateRoute,
  loginRoute,
  forgotPasswordRoute,
  linkRoute,
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
