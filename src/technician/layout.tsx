import { Outlet } from '@tanstack/react-router';
import { useAuth } from '@/app/auth-context';
import { LogoutButton } from '@/app/logout-button';
import { RequireAccess } from '@/app/pages/gate';
import { t } from '@/lib/i18n';

/** Interface do técnico: celular, uma coluna, offline-first (docs/screens.md). */
export function TechnicianLayout() {
  const { session } = useAuth();
  return (
    <RequireAccess kind="technician">
      {() => (
        <div className="mx-auto flex min-h-svh max-w-md flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2">
            <span className="font-semibold">{t('common.appName')}</span>
            {session && <LogoutButton userId={session.user.id} />}
          </header>
          <main className="flex-1 p-4">
            <Outlet />
          </main>
        </div>
      )}
    </RequireAccess>
  );
}
