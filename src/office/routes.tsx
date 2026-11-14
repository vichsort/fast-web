// Rotas da interface do escritório (só esta área mexe aqui).
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '@/app/root-route';
import { OfficeHome } from './home';
import { OfficeLayout } from './layout';

export const officeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/office', component: OfficeLayout });
const homeRoute = createRoute({ getParentRoute: () => officeRoute, path: '/', component: OfficeHome });

export const officeRouteTree = officeRoute.addChildren([homeRoute]);
