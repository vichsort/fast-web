// Rotas da interface do técnico (só esta área mexe aqui).
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '@/app/root-route';
import { TechnicianHome } from './home';
import { TechnicianLayout } from './layout';

export const technicianRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/technician',
  component: TechnicianLayout,
});
const homeRoute = createRoute({ getParentRoute: () => technicianRoute, path: '/', component: TechnicianHome });

export const technicianRouteTree = technicianRoute.addChildren([homeRoute]);
