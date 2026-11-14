// Cartão de contador do dashboard (05) e a grade que os organiza.
import { useRender } from '@base-ui/react/use-render';
import {
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleX,
  ClockExclamationPoint,
  FilePlus,
  Hourglass,
  type LucideIcon,
  Play,
  UserRoundX,
} from 'lucide-react';
import type * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { flagVar, statusVar, type Tone, toneVar } from './tone';

export interface StatCardProps extends Omit<React.ComponentProps<'div'>, 'onClick'> {
  label: string;
  /** `null` mostra o carregando. */
  value: number | null;
  icon?: LucideIcon;
  tone?: Tone;
  /** Classe que define --tone (tem prioridade sobre `tone`). */
  toneClass?: string;
  /** Linha de apoio (ex.: "retrabalho"). */
  hint?: string;
  /** Pede atenção: fundo tingido e número na cor do tom (ex.: atrasadas > 0). */
  highlight?: boolean;
  /** Link para a lista filtrada (ex.: `<Link to="/office/orders" search={{ overdue: true }} />`). */
  render?: React.ReactElement;
  href?: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

/** Contador: número grande, rótulo, ícone no tom e link opcional. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  toneClass,
  hint,
  highlight,
  render,
  href,
  onClick,
  size = 'md',
  className,
  ...props
}: StatCardProps) {
  const interactive = Boolean(render || href || onClick);
  const link = useRender({
    defaultTagName: 'span',
    // biome-ignore lint/a11y/useAnchorContent: o rótulo entra como filho pelo useRender
    render: render ?? (href ? <a href={href} /> : onClick ? <button type="button" onClick={onClick} /> : undefined),
    props: {
      className: cn(
        'text-left outline-none',
        interactive &&
          'after:absolute after:inset-0 after:rounded-xl after:content-[""] focus-visible:after:ring-3 focus-visible:after:ring-ring/50',
      ),
      children: label,
    },
  });
  return (
    <div
      data-slot="stat-card"
      data-highlight={highlight || undefined}
      className={cn(
        'group/stat relative flex flex-col gap-2 rounded-xl border bg-card text-card-foreground shadow-xs transition-colors',
        size === 'sm' ? 'p-3' : 'p-4',
        toneClass ?? toneVar[tone],
        highlight && 'tone-wash border-[color-mix(in_oklch,var(--tone)_35%,var(--border))]',
        interactive && 'hover:bg-accent/40',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{link}</span>
        {Icon && (
          <span
            className={cn(
              'tone-soft flex shrink-0 items-center justify-center rounded-lg border',
              size === 'sm' ? 'size-7' : 'size-8',
            )}
          >
            <Icon aria-hidden className="size-4" />
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        {value === null ? (
          <Skeleton className={cn(size === 'sm' ? 'h-7 w-10' : 'h-9 w-14')} />
        ) : (
          <span
            className={cn(
              'font-heading font-semibold leading-none tracking-tight tabular-nums',
              size === 'sm' ? 'text-2xl' : 'text-3xl',
              highlight && value > 0 && 'tone-text',
            )}
          >
            {formatNumber(value)}
          </span>
        )}
        {interactive && (
          <ChevronRight
            aria-hidden
            className="size-4 text-muted-foreground transition-transform group-hover/stat:translate-x-0.5"
          />
        )}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** Grade responsiva de contadores (2 colunas no celular, até 4 no largo). */
export function StatGrid({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className="@container/stats">
      <div
        data-slot="stat-grid"
        className={cn('grid grid-cols-2 gap-3 @2xl/stats:grid-cols-4', className)}
        {...props}
      />
    </div>
  );
}

export type DashboardStatKey =
  | 'open'
  | 'unassigned'
  | 'in_progress'
  | 'pending_approval'
  | 'rejected'
  | 'overdue'
  | 'approved_this_month'
  | 'late_supplements_unseen';

/**
 * Os contadores do get_dashboard (05) na ordem da tela, com ícone, tom e quando pedem atenção. As telas montam
 * os StatCards a partir daqui (o link de cada um é da tela).
 */
export const DASHBOARD_STATS: {
  key: DashboardStatKey;
  label: string;
  icon: LucideIcon;
  toneClass: string;
  hint?: string;
  /** Destaca quando o valor é maior que zero. */
  alertWhenPositive?: boolean;
}[] = [
  {
    key: 'pending_approval',
    label: t('ui.stats.pending_approval'),
    icon: Hourglass,
    toneClass: statusVar.pending_approval,
    alertWhenPositive: true,
  },
  {
    key: 'overdue',
    label: t('ui.stats.overdue'),
    icon: ClockExclamationPoint,
    toneClass: flagVar.overdue,
    alertWhenPositive: true,
  },
  {
    key: 'late_supplements_unseen',
    label: t('ui.stats.late_supplements_unseen'),
    icon: FilePlus,
    toneClass: flagVar.lateSupplement,
    hint: t('ui.stats.lateHint'),
    alertWhenPositive: true,
  },
  {
    key: 'unassigned',
    label: t('ui.stats.unassigned'),
    icon: UserRoundX,
    toneClass: flagVar.unassigned,
    alertWhenPositive: true,
  },
  { key: 'open', label: t('ui.stats.open'), icon: CircleDashed, toneClass: statusVar.open },
  { key: 'in_progress', label: t('ui.stats.in_progress'), icon: Play, toneClass: statusVar.in_progress },
  {
    key: 'rejected',
    label: t('ui.stats.rejected'),
    icon: CircleX,
    toneClass: statusVar.rejected,
    hint: t('ui.stats.rejectedHint'),
  },
  {
    key: 'approved_this_month',
    label: t('ui.stats.approved_this_month'),
    icon: CircleCheck,
    toneClass: statusVar.approved,
  },
];
