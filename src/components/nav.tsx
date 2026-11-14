// Navegação: marca, barra inferior do técnico (celular) e barra lateral e topo do escritório. Não conhece as
// rotas: cada item recebe o elemento de navegação por `render` (ex.: `<Link to="/office/orders" />`) e o `active`.
import { useRender } from '@base-ui/react/use-render';
import { type LucideIcon, Menu } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CountBadge } from './badges';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Contador no ícone (ex.: itens na fila, O.S. aguardando aprovação). */
  badge?: number;
  active?: boolean;
  render?: React.ReactElement;
  href?: string;
  onClick?: () => void;
}

function NavLink({ item, className, children }: { item: NavItem; className: string; children: React.ReactNode }) {
  return useRender({
    defaultTagName: 'a',
    render: item.render ?? (item.href ? undefined : <button type="button" onClick={item.onClick} />),
    props: {
      href: item.render ? undefined : item.href,
      'aria-current': item.active ? 'page' : undefined,
      'data-active': item.active || undefined,
      className,
      children,
    },
  });
}

/** Marca do produto: símbolo (lente de câmera) e nome. */
export function Brand({
  size = 'md',
  hideName,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  hideName?: boolean;
  className?: string;
}) {
  const box = { sm: 'size-6', md: 'size-8', lg: 'size-10' }[size];
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className={cn('flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground', box)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-[62%]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
          <path d="M12 4v2.5M20 12h-2.5" strokeLinecap="round" />
        </svg>
      </span>
      {!hideName && (
        <span
          className={cn(
            'font-heading font-bold tracking-tight',
            size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base',
          )}
        >
          {t('common.appName')}
        </span>
      )}
    </span>
  );
}

export interface BottomNavProps extends React.ComponentProps<'nav'> {
  items: NavItem[];
  /** `fixed` (padrão) prende embaixo da tela; `static` para vitrines e pré-visualizações. */
  position?: 'fixed' | 'static';
}

/** Barra inferior do técnico: alvos grandes, ícone e rótulo, item ativo e contador. */
export function TechnicianBottomNav({ items, position = 'fixed', className, ...props }: BottomNavProps) {
  return (
    <nav
      aria-label={t('ui.nav.main')}
      data-slot="bottom-nav"
      className={cn(
        'z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-card/85',
        position === 'fixed' && 'fixed inset-x-0 bottom-0',
        className,
      )}
      {...props}
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex-1">
              <NavLink
                item={item}
                className={cn(
                  'relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground outline-none transition-colors focus-visible:bg-muted',
                  'data-active:text-primary',
                )}
              >
                {item.active && (
                  <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-primary" />
                )}
                <span className="relative">
                  <Icon aria-hidden className="size-6" strokeWidth={item.active ? 2.4 : 2} />
                  <CountBadge count={item.badge ?? 0} className="absolute -top-1.5 -right-2.5 ring-2 ring-card" />
                </span>
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export interface OfficeSidebarProps extends React.ComponentProps<'aside'> {
  /** Grupos de itens; o rótulo do grupo é opcional. */
  groups: { label?: string; items: NavItem[] }[];
  /** Rodapé (chip do usuário, sair). */
  footer?: React.ReactNode;
  /** Só ícones (com o rótulo na dica). */
  collapsed?: boolean;
}

/** Barra lateral do escritório, no tom escuro da marca (tokens --sidebar-*). */
export function OfficeSidebar({ groups, footer, collapsed, className, ...props }: OfficeSidebarProps) {
  return (
    <aside
      data-slot="office-sidebar"
      data-collapsed={collapsed || undefined}
      className={cn(
        'flex h-full flex-col gap-2 border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        collapsed ? 'w-16' : 'w-60',
        className,
      )}
      {...props}
    >
      <div
        className={cn('flex h-14 items-center text-sidebar-accent-foreground', collapsed ? 'justify-center' : 'px-4')}
      >
        <Brand hideName={collapsed} />
      </div>
      <nav aria-label={t('ui.nav.main')} className="flex flex-1 flex-col gap-4 overflow-y-auto px-2">
        {groups.map((group, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: grupos fixos, na ordem em que vêm
          <div key={index} className="flex flex-col gap-0.5">
            {group.label && !collapsed && (
              <span className="px-2.5 pb-1 text-[0.6875rem] font-semibold tracking-wider text-sidebar-foreground/60 uppercase">
                {group.label}
              </span>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  item={item}
                  className={cn(
                    'relative flex h-9 items-center gap-2.5 rounded-lg text-sm font-medium outline-none transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    'data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground',
                    collapsed ? 'justify-center' : 'px-2.5',
                  )}
                >
                  {item.active && (
                    <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-sidebar-primary" />
                  )}
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {collapsed ? (
                    <span className="sr-only">{item.label}</span>
                  ) : (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  <CountBadge
                    count={item.badge ?? 0}
                    tone="warning"
                    className={cn(collapsed && 'absolute top-0.5 right-0.5 h-4 min-w-4 px-1 text-[0.625rem]')}
                  />
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && <div className="border-t border-sidebar-border p-3">{footer}</div>}
    </aside>
  );
}

export interface OfficeTopbarProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  /** Abre a navegação no estreito (mostra o botão de menu). */
  onMenu?: () => void;
  /** Título ou trilha da tela. */
  title?: React.ReactNode;
  /** À direita: busca global, usuário. */
  actions?: React.ReactNode;
  /** Mostra a marca (quando não há barra lateral visível). */
  showBrand?: boolean;
}

/** Topo do escritório: menu (estreito), marca ou título e ações. */
export function OfficeTopbar({ onMenu, title, actions, showBrand, className, ...props }: OfficeTopbarProps) {
  return (
    <header
      data-slot="office-topbar"
      className={cn(
        'sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80',
        className,
      )}
      {...props}
    >
      {onMenu && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1.5 lg:hidden"
          onClick={onMenu}
          aria-label={t('ui.actions.toggleMenu')}
        >
          <Menu />
        </Button>
      )}
      {showBrand && <Brand size="sm" />}
      {title && <div className="min-w-0 flex-1 truncate text-sm font-medium">{title}</div>}
      {!title && <div className="flex-1" />}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
