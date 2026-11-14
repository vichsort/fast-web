import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SessionProvider } from '@/app/auth-context';
import { router } from '@/app/router';
import { Toaster } from '@/components/ui/sonner';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root ausente no index.html');

const queryClient = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
        <Toaster />
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
