import { MapPin, Navigation } from 'lucide-react';
import type * as React from 'react';
import { mapsUrl } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Barra de ações presa acima da barra inferior (o polegar alcança; o conteúdo rola por trás). */
export function ActionBar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-20" />
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/85">
        <div className={cn('mx-auto flex max-w-lg flex-col gap-2 px-4 py-3', className)}>{children}</div>
      </div>
    </>
  );
}

/**
 * Prévia de mapa desenhada (ruas e um pino), sem baixar tiles: funciona sem sinal e toca para abrir o app de mapas.
 * No real, pode virar um mapa estático em cache; o link continua o mesmo.
 */
export function MapPreview({ address, className }: { address: string; className?: string }) {
  return (
    <a
      href={mapsUrl(address)}
      target="_blank"
      rel="noreferrer"
      aria-label={t('technician.detail.mapLabel', { address })}
      className={cn(
        'group relative block h-32 overflow-hidden rounded-lg border bg-[color-mix(in_oklab,var(--tone-success)_10%,var(--muted))] outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 360 128"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <g className="fill-background/70">
          <rect x="18" y="14" width="70" height="38" rx="4" />
          <rect x="18" y="72" width="70" height="44" rx="4" />
          <rect x="112" y="14" width="96" height="38" rx="4" />
          <rect x="232" y="14" width="110" height="38" rx="4" />
          <rect x="232" y="72" width="54" height="44" rx="4" />
          <rect x="300" y="72" width="44" height="44" rx="4" />
        </g>
        <rect
          x="112"
          y="72"
          width="96"
          height="44"
          rx="4"
          className="fill-[color-mix(in_oklab,var(--tone-success)_30%,var(--background))]"
        />
        <g className="stroke-card" strokeWidth="10" strokeLinecap="round">
          <path d="M0 62 H360" />
          <path d="M100 0 V128" />
          <path d="M220 0 V128" />
        </g>
        <path
          d="M0 62 H360"
          className="stroke-[color-mix(in_oklab,var(--tone-warning)_55%,var(--card))]"
          strokeWidth="3"
          strokeDasharray="10 8"
        />
      </svg>
      <span className="absolute top-[38%] left-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center drop-shadow-md">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-primary/25">
          <MapPin aria-hidden className="size-5" />
        </span>
      </span>
      <span className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-sm group-hover:bg-muted">
        <Navigation aria-hidden className="size-4" />
        {t('ui.actions.openMap')}
      </span>
    </a>
  );
}

/** Título de um grupo da lista, com contador e dica. */
export function GroupHeading({
  title,
  count,
  hint,
  toneClass,
  className,
}: {
  title: string;
  count: number;
  hint?: string;
  /** Ponto colorido do grupo (ex.: statusVar.rejected). */
  toneClass?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
        {toneClass && <span aria-hidden className={cn('tone-fill size-2.5 rounded-full', toneClass)} />}
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {count}
        </span>
      </h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
