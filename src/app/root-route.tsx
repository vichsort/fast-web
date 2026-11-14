import { createRootRoute, Outlet } from '@tanstack/react-router';

/** Rota raiz, num arquivo próprio: cada área declara as suas rotas filhas sem importar o router (sem ciclo). */
export const rootRoute = createRootRoute({ component: Outlet });
