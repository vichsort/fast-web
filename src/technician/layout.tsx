import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { ClipboardList, ListTodo, UserRound } from 'lucide-react';
import type { Access } from '@/app/access';
import { RequireAccess } from '@/app/pages/gate';
import { TechnicianShell } from '@/components/app-shell';
import type { NavItem } from '@/components/nav';
import { ScratchBanner } from '@/components/states';
import { SyncIndicator } from '@/components/sync';
import { usingMocks } from '@/lib/data-source';
import { t } from '@/lib/i18n';
import { TechnicianRuntime, useMyOrders, usePendingItems, useSyncStatus, useTimeZone } from './api';

/** Interface do técnico: celular, uma coluna, offline-first (docs/screens.md, docs/screens-technician.md). */
export function TechnicianLayout() {
  return (
    <RequireAccess kind="technician">
      {(access: Access) => (
        <TechnicianRuntime access={access}>
          <TechnicianFrame />
        </TechnicianRuntime>
      )}
    </RequireAccess>
  );
}

function TechnicianFrame() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sync = useSyncStatus();
  const TZ = useTimeZone();
  const orders = useMyOrders().data;
  const pending = usePendingItems().data;
  const section = pathname.startsWith('/technician/pending')
    ? 'pending'
    : pathname.startsWith('/technician/profile')
      ? 'profile'
      : 'orders';

  const navItems: NavItem[] = [
    {
      id: 'orders',
      label: t('ui.nav.myOrders'),
      icon: ClipboardList,
      badge: orders?.filter((o) => o.is_new).length,
      active: section === 'orders',
      render: <Link to="/technician" />,
    },
    {
      id: 'pending',
      label: t('ui.nav.pending'),
      icon: ListTodo,
      badge: pending?.length,
      active: section === 'pending',
      render: <Link to="/technician/pending" />,
    },
    {
      id: 'profile',
      label: t('ui.nav.profile'),
      icon: UserRound,
      active: section === 'profile',
      render: <Link to="/technician/profile" />,
    },
  ];

  return (
    <TechnicianShell
      navItems={navItems}
      sync={sync && <SyncIndicator status={sync} timeZone={TZ} render={<Link to="/technician/pending" />} />}
      banner={usingMocks ? <ScratchBanner /> : undefined}
    >
      <Outlet />
    </TechnicianShell>
  );
}
