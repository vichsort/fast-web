import { Link, Outlet } from '@tanstack/react-router';
import { useAuth } from '@/app/auth-context';
import { LogoutButton } from '@/app/logout-button';
import { RequireAccess } from '@/app/pages/gate';
import { t } from '@/lib/i18n';

/** Interface do escritório: computador, online (docs/screens.md). */
export function OfficeLayout() {
  const { session } = useAuth();
  return (
    <RequireAccess kind="office">
      {() => (
        <div className="flex min-h-svh flex-col">
          <header className="border-b bg-background">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
              <div className="flex items-center gap-6">
                <span className="font-semibold">{t('common.appName')}</span>
                <nav className="flex gap-4 text-sm">
                  <Link
                    to="/office"
                    className="text-muted-foreground [&.active]:font-medium [&.active]:text-foreground"
                  >
                    {t('nav.officeHome')}
                  </Link>
                </nav>
              </div>
              {session && <LogoutButton userId={session.user.id} />}
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 p-6">
            <Outlet />
          </main>
        </div>
      )}
    </RequireAccess>
  );
}
