import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';

/** Rota raiz, num arquivo próprio: cada área declara as suas rotas filhas sem importar o router (sem ciclo). */
export const rootRoute = createRootRoute({ component: Root });

/** Abaixo da barra de status do celular (o Sonner não conta a área segura). */
const TOP_OFFSET = { top: 'calc(env(safe-area-inset-top) + 16px)' };

/**
 * No técnico, o aviso fica no topo: embaixo ele cobria a barra inferior e a barra de ação fixa acima dela
 * (decisions.md, Telas do técnico). No resto, o padrão do Sonner.
 */
function Root() {
  const technician = useRouterState({ select: (s) => s.location.pathname.startsWith('/technician') });
  return (
    <>
      <Outlet />
      {technician ? <Toaster position="top-center" offset={TOP_OFFSET} mobileOffset={TOP_OFFSET} /> : <Toaster />}
    </>
  );
}
