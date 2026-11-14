// Moldura de cada interface (só a estrutura visual; o layout de rota com RequireAccess fica em src/<área>/).
import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Brand, type NavItem, OfficeSidebar, type OfficeSidebarProps, OfficeTopbar, TechnicianBottomNav } from './nav';

export interface TechnicianShellProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Título no topo (padrão: a marca). */
  title?: React.ReactNode;
  /** Indicador de sincronização (SyncIndicator variant="pill"). */
  sync?: React.ReactNode;
  /** Ações à direita do topo (avatar, menu). */
  headerActions?: React.ReactNode;
  /** Faixa abaixo do topo (aviso de sem conexão, de scratch). */
  banner?: React.ReactNode;
  navItems: NavItem[];
  /** `static` para vitrines (não prende a barra na janela). */
  navPosition?: 'fixed' | 'static';
}

/** Celular do técnico: topo com sincronização, conteúdo em uma coluna e barra inferior. */
export function TechnicianShell({
  title,
  sync,
  headerActions,
  banner,
  navItems,
  navPosition = 'fixed',
  className,
  children,
  ...props
}: TechnicianShellProps) {
  return (
    <div
      data-slot="technician-shell"
      data-density="touch"
      className={cn('flex min-h-svh flex-col bg-background', className)}
      {...props}
    >
      <header className="sticky top-0 z-20 border-b bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-card/85">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <div className="min-w-0 flex-1 truncate font-heading text-base font-semibold">
            {title ?? <Brand size="sm" />}
          </div>
          {sync}
          {headerActions}
        </div>
      </header>
      {banner && <div className="mx-auto w-full max-w-lg px-4 pt-3">{banner}</div>}
      <main className={cn('mx-auto w-full max-w-lg flex-1 px-4 py-4', navPosition === 'fixed' && 'pb-24')}>
        {children}
      </main>
      <TechnicianBottomNav
        items={navItems}
        position={navPosition}
        className={cn(navPosition === 'static' && 'sticky bottom-0')}
      />
    </div>
  );
}

export interface OfficeShellProps extends React.ComponentProps<'div'> {
  groups: OfficeSidebarProps['groups'];
  sidebarFooter?: React.ReactNode;
  /** Título ou trilha no topo. */
  topbarTitle?: React.ReactNode;
  topbarActions?: React.ReactNode;
  banner?: React.ReactNode;
  /** Largura máxima do conteúdo. */
  width?: 'default' | 'wide' | 'full';
}

/** Computador do escritório: barra lateral (vira menu no estreito), topo e conteúdo largo. */
export function OfficeShell({
  groups,
  sidebarFooter,
  topbarTitle,
  topbarActions,
  banner,
  width = 'default',
  className,
  children,
  ...props
}: OfficeShellProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  // Fecha o menu ao escolher um item (no estreito).
  const closingGroups = groups.map((g) => ({
    ...g,
    items: g.items.map((item) => ({
      ...item,
      onClick: () => {
        item.onClick?.();
        setMenuOpen(false);
      },
    })),
  }));
  return (
    <div data-slot="office-shell" className={cn('flex min-h-svh bg-background', className)} {...props}>
      <OfficeSidebar groups={groups} footer={sidebarFooter} className="sticky top-0 hidden h-svh shrink-0 lg:flex" />
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-60 border-0 p-0 sm:max-w-60">
          <SheetTitle className="sr-only">{t('ui.nav.main')}</SheetTitle>
          <SheetDescription className="sr-only">{t('ui.nav.main')}</SheetDescription>
          <OfficeSidebar groups={closingGroups} footer={sidebarFooter} className="w-full border-0" />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <OfficeTopbar onMenu={() => setMenuOpen(true)} title={topbarTitle} actions={topbarActions} />
        {banner && <div className="px-4 pt-4 lg:px-6">{banner}</div>}
        <main
          className={cn(
            'mx-auto w-full flex-1 px-4 py-6 lg:px-6',
            width === 'default' && 'max-w-6xl',
            width === 'wide' && 'max-w-7xl',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
