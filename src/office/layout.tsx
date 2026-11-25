import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Building2,
  ChevronsUpDown,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  ScrollText,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';
import type { Access } from '@/app/access';
import { useAuth } from '@/app/auth-context';
import { RequireAccess } from '@/app/pages/gate';
import { signOutAndWipe } from '@/app/session';
import { useVersionCheck } from '@/app/version-check';
import { OfficeShell } from '@/components/app-shell';
import type { NavItem } from '@/components/nav';
import { PhotoErrorProvider } from '@/components/photos';
import { ErrorState, LoadingDetail, ScratchBanner } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user';
import { usingMocks } from '@/lib/data-source';
import { t } from '@/lib/i18n';
import { usePhotoUrlRenewal } from '@/lib/orders-query';
import { bindSession, officeCompany, officeSessionUser } from './api';
import { useDashboard } from './queries';
import { type OfficeSession, OfficeSessionProvider } from './session';

/** Interface do escritório: computador, online (docs/screens.md, docs/screens-office.md). */
export function OfficeLayout() {
  return <RequireAccess kind="office">{(access) => <OfficeFrame access={access} />}</RequireAccess>;
}

function OfficeFrame({ access }: { access: Access }) {
  const { session: auth } = useAuth();
  useVersionCheck();
  const role = 'role' in access && access.role === 'owner' ? 'owner' : 'manager';
  if (auth && 'companyId' in access) bindSession({ userId: auth.user.id, companyId: access.companyId });
  const user = useQuery({ queryKey: ['office', 'session', role], queryFn: () => officeSessionUser(role) });
  const company = useQuery({ queryKey: ['office', 'company'], queryFn: () => officeCompany() });
  if (user.isError || company.isError) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorState
          onRetry={() => {
            void user.refetch();
            void company.refetch();
          }}
        />
      </div>
    );
  }
  if (!user.data || !company.data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <LoadingDetail />
      </div>
    );
  }
  const session: OfficeSession = {
    role,
    isOwner: role === 'owner',
    user: user.data,
    actor: { id: user.data.id, full_name: user.data.full_name },
    company: company.data,
    timeZone: company.data.timezone,
  };
  return (
    <OfficeSessionProvider value={session}>
      <Shell session={session} />
    </OfficeSessionProvider>
  );
}

function Shell({ session }: { session: OfficeSession }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, '');
  const dashboard = useDashboard();
  const active = (path: string) => (path === '/office' ? pathname === '/office' : pathname.startsWith(path));
  const onPhotoError = usePhotoUrlRenewal(['office', 'order']);
  const reviewBadge = dashboard.data ? dashboard.data.pending_approval + dashboard.data.late_supplements_unseen : 0;

  const work: NavItem[] = [
    {
      id: 'dashboard',
      label: t('office.nav.dashboard'),
      icon: LayoutDashboard,
      active: active('/office'),
      render: <Link to="/office" />,
    },
    {
      id: 'orders',
      label: t('office.nav.orders'),
      icon: ClipboardList,
      active: active('/office/orders'),
      render: <Link to="/office/orders" />,
    },
    {
      id: 'review',
      label: t('office.nav.review'),
      icon: ClipboardCheck,
      badge: reviewBadge,
      active: active('/office/review'),
      render: <Link to="/office/review" />,
    },
    {
      id: 'clients',
      label: t('office.nav.clients'),
      icon: UsersRound,
      active: active('/office/clients'),
      render: <Link to="/office/clients" />,
    },
  ];
  const admin: NavItem[] = [
    {
      id: 'company',
      label: t('office.nav.company'),
      icon: Building2,
      active: active('/office/company'),
      render: <Link to="/office/company" />,
    },
    {
      id: 'members',
      label: t('office.nav.members'),
      icon: Users,
      active: active('/office/members'),
      render: <Link to="/office/members" />,
    },
    {
      id: 'audit',
      label: t('office.nav.audit'),
      icon: ScrollText,
      active: active('/office/audit'),
      render: <Link to="/office/audit" />,
    },
  ];
  const groups = [
    { label: t('office.nav.groupWork'), items: work },
    ...(session.isOwner ? [{ label: t('office.nav.groupAdmin'), items: admin }] : []),
  ];
  const current = [...work, ...(session.isOwner ? admin : [])].find((item) => item.active);
  const section = current?.label ?? (active('/office/profile') ? t('office.nav.profile') : null);

  return (
    <OfficeShell
      groups={groups}
      width="wide"
      sidebarFooter={<UserMenu session={session} />}
      topbarTitle={
        <span className="text-muted-foreground">
          {session.company.name}
          {section && <span className="text-foreground"> · {section}</span>}
        </span>
      }
      topbarActions={
        !active('/office/orders/new') && (
          <Button size="sm" render={<Link to="/office/orders/new" />} nativeButton={false}>
            <Plus />
            {t('office.nav.newOrder')}
          </Button>
        )
      }
      banner={usingMocks ? <ScratchBanner /> : undefined}
    >
      <PhotoErrorProvider value={onPhotoError}>
        <Outlet />
      </PhotoErrorProvider>
    </OfficeShell>
  );
}

/** Rodapé da lateral: quem está logado, Meu perfil e Sair (logout real; as leituras em memória saem na troca de usuário, session.ts). */
function UserMenu({ session }: { session: OfficeSession }) {
  const { session: auth } = useAuth();
  const navigate = useNavigate();
  async function logout() {
    if (!auth) return;
    await signOutAndWipe(auth.user.id);
    await navigate({ to: '/login' });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('office.nav.userMenu')}
        className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <UserAvatar name={session.user.full_name} seed={session.user.id} size="sm" decorative />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-sidebar-accent-foreground">{session.user.full_name}</span>
          <span className="truncate text-xs text-sidebar-foreground/70">{t(`ui.role.${session.role}`)}</span>
        </span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-sidebar-foreground/60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        <DropdownMenuItem render={<Link to="/office/profile" />}>
          <UserRound />
          {t('office.nav.profile')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
          <LogOut />
          {t('office.nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
