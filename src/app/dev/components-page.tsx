/**
 * Vitrine dos componentes reutilizáveis (só em desenvolvimento): /dev/components.
 * "Celular" carrega a própria página num iframe de 390 px (?frame=1), para as media queries valerem de verdade.
 */
import { Monitor, Moon, Smartphone, Sun } from 'lucide-react';
import * as React from 'react';
import { Brand } from '@/components/nav';
import { ScratchBanner } from '@/components/states';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  BadgesSection,
  FormatSection,
  LayoutSection,
  StatesSection,
  TokensSection,
  UsersSection,
} from './showcase/basics';
import { AddressSection, ExecutionsSection, PhotosSection, TimelineSection } from './showcase/detail';
import { DialogsSection, NavSection, SyncSection } from './showcase/device';
import { OrdersSection, PickersSection, StatsSection, TableSection } from './showcase/lists';

type Theme = 'light' | 'dark';
type Width = 'mobile' | 'desktop';
type Density = 'compact' | 'comfortable' | 'touch';

const sections = [
  'tokens',
  'badges',
  'layout',
  'states',
  'orders',
  'table',
  'filters',
  'stats',
  'timeline',
  'address',
  'photos',
  'executions',
  'sync',
  'dialogs',
  'nav',
  'users',
  'format',
] as const;

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const density = params.get('density');
  return {
    frame: params.get('frame') === '1',
    theme: (params.get('theme') === 'dark' ? 'dark' : 'light') as Theme,
    density: (density === 'compact' || density === 'touch' ? density : 'comfortable') as Density,
  };
}

function Sections({ density }: { density: Density }) {
  return (
    <div data-density={density} className="flex flex-col gap-10">
      <ScratchBanner />
      <TokensSection />
      <BadgesSection />
      <LayoutSection />
      <StatesSection />
      <OrdersSection />
      <TableSection />
      <PickersSection />
      <StatsSection />
      <TimelineSection />
      <AddressSection />
      <PhotosSection />
      <ExecutionsSection />
      <SyncSection />
      <DialogsSection />
      <NavSection />
      <UsersSection />
      <FormatSection />
    </div>
  );
}

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      value={[value]}
      onValueChange={(next) => next[0] && onChange(next[0] as T)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} aria-label={o.label}>
          {o.icon}
          <span className={cn(o.icon && 'max-md:sr-only')}>{o.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function ComponentsPage() {
  const initial = React.useMemo(readParams, []);
  const [theme, setTheme] = React.useState<Theme>(initial.theme);
  const [width, setWidth] = React.useState<Width>('desktop');
  const [density, setDensity] = React.useState<Density>(initial.density);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    return () => document.documentElement.classList.remove('dark');
  }, [theme]);

  if (initial.frame) {
    return (
      <main className="p-4">
        <Sections density={density} />
      </main>
    );
  }

  const frameSrc = `${window.location.pathname}?frame=1&theme=${theme}&density=${density}`;

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <Brand size="sm" />
          <span className="text-sm font-medium text-muted-foreground max-sm:hidden">{t('ui.showcase.title')}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Toggle
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: t('ui.showcase.light'), icon: <Sun /> },
                { value: 'dark', label: t('ui.showcase.dark'), icon: <Moon /> },
              ]}
            />
            <Toggle
              value={width}
              onChange={setWidth}
              options={[
                { value: 'mobile', label: t('ui.showcase.mobile'), icon: <Smartphone /> },
                { value: 'desktop', label: t('ui.showcase.desktop'), icon: <Monitor /> },
              ]}
            />
            <Toggle
              value={density}
              onChange={setDensity}
              options={(['compact', 'comfortable', 'touch'] as const).map((d) => ({
                value: d,
                label: t(`ui.showcase.${d}`),
              }))}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6">
        <nav
          aria-label={t('ui.showcase.nav')}
          className="sticky top-20 hidden h-fit w-44 shrink-0 flex-col gap-0.5 xl:flex"
        >
          <span className="px-2 pb-1 text-xs font-semibold text-muted-foreground uppercase">
            {t('ui.showcase.nav')}
          </span>
          {sections.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className={cn(
                'rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                width === 'mobile' && 'pointer-events-none opacity-50',
              )}
            >
              {t(`ui.showcase.sections.${id}`)}
            </a>
          ))}
        </nav>
        <main className="min-w-0 flex-1">
          <div className="mb-8 flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{t('ui.showcase.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('ui.showcase.description')}</p>
          </div>
          {width === 'desktop' ? (
            <Sections density={density} />
          ) : (
            <div className="flex justify-center">
              <iframe
                key={frameSrc}
                title={t('ui.showcase.mobile')}
                src={frameSrc}
                className="h-[calc(100svh-10rem)] w-[406px] max-w-full rounded-[2rem] border-8 border-foreground/85 bg-background shadow-xl"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
