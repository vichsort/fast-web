import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { SessionProvider } from '@/app/auth-context';
import { createQueryClient } from '@/app/query-client';
import { router } from '@/app/router';
import './index.css';

// Sem o atalho do Zod que testa `new Function`: a CSP (security-headers.ts) barra eval, e o teste dele vira uma
// violação no console a cada página.
z.config({ jitless: true });

const root = document.getElementById('root');
if (!root) throw new Error('#root ausente no index.html');

const queryClient = createQueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
