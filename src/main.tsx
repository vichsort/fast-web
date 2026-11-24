import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SessionProvider } from '@/app/auth-context';
import { createQueryClient } from '@/app/query-client';
import { router } from '@/app/router';
import './index.css';

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
