// Rotas de desenvolvimento (vitrine de componentes). Fora do build de produção (router.tsx).
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '@/app/root-route';
import { ComponentsPage } from './components-page';

export const devRouteTree = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dev/components',
  component: ComponentsPage,
});
