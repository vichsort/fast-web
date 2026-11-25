import { Navigate, useNavigate } from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import type { Access } from '../access';
import { useAuth } from '../auth-context';
import { updateApp, useUpdateRequired } from '../min-version';
import { signOutAndWipe, useAccess } from '../session';
import { InvitePage } from './invite';

function Loading() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <span className="sr-only">{t('common.loading')}</span>
    </main>
  );
}

function Message({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="max-w-sm text-muted-foreground">{text}</p>
      {children}
    </main>
  );
}

/** Raiz: sem sessão vai ao login; senão, à interface do papel (access.ts) ou ao convite. */
export function Gate() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const access = useAccess(session?.user.id);
  const wiping = useRef(false);

  useEffect(() => {
    if (access.data?.kind !== 'no_access' || !session || wiping.current) return;
    wiping.current = true;
    void signOutAndWipe(session.user.id).then(() => navigate({ to: '/login', search: { removed: true } }));
  }, [access.data, session, navigate]);

  if (!ready) return <Loading />;
  if (!session) return <Navigate to="/login" />;
  if (!access.data) return <Loading />;

  switch (access.data.kind) {
    case 'technician':
      return <Navigate to="/technician" />;
    case 'office':
      return <Navigate to="/office" />;
    case 'no_access':
      return <Loading />;
    case 'invited':
      return <InvitePage userId={session.user.id} invites={access.data.invites} />;
    case 'platform_admin':
      return (
        <Message text={t('access.platformAdmin')}>
          <Button
            variant="outline"
            onClick={() => void signOutAndWipe(session.user.id).then(() => navigate({ to: '/login' }))}
          >
            {t('common.logout')}
          </Button>
        </Message>
      );
    case 'offline_first_access':
      return (
        <Message text={t('access.offlineFirstAccess')}>
          <Button variant="outline" onClick={() => void access.refetch()}>
            {t('access.retry')}
          </Button>
        </Message>
      );
  }
}

/** Guarda das interfaces: só entra quem tem aquele acesso; o resto volta à raiz, que decide. */
export function RequireAccess({
  kind,
  children,
}: {
  kind: 'technician' | 'office';
  children: (access: Access) => ReactNode;
}) {
  const { session, ready } = useAuth();
  const access = useAccess(session?.user.id);
  const outdated = useUpdateRequired(Boolean(session));
  if (!ready || (session && !access.data)) return <Loading />;
  if (!session || access.data?.kind !== kind) return <Navigate to="/" />;
  if (outdated) return <UpdateRequired />;
  return children(access.data);
}

/** Abaixo da versão mínima (min-version.ts): só atualizar. A interface, e com ela a fila da página, não abre. */
function UpdateRequired() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="font-heading text-xl font-semibold">{t('update.title')}</h1>
      <p className="max-w-sm text-muted-foreground">{t('update.description')}</p>
      <Button onClick={() => void updateApp()}>{t('update.now')}</Button>
      <p className="max-w-sm text-xs text-muted-foreground">{t('update.stillHere')}</p>
    </main>
  );
}
