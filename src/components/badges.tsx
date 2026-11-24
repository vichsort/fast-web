// Selos do domínio. Cada um mostra texto (nunca só cor) e pega a cor de um token do tema (src/components/tone.ts).
import { cva, type VariantProps } from 'class-variance-authority';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Building,
  Camera,
  Cctv,
  ChevronsUp,
  CircleCheck,
  CircleDashed,
  CircleX,
  ClipboardList,
  Clock,
  ClockExclamationPoint,
  FilePlus,
  HardHat,
  Hourglass,
  Image,
  type LucideIcon,
  Minus,
  Play,
  ShieldCheck,
  TriangleExclamationPoint,
  UserRoundX,
  Wrench,
} from 'lucide-react';
import type * as React from 'react';
import type { MemberRole, OrderPriority, OrderStatus, PhotoSource, ReviewStatus, ServiceType } from '@/lib/enums';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExecutionAlert, PhotoAlert } from '@/photos/alerts';
import {
  alertVar,
  flagVar,
  priorityVar,
  reviewVar,
  roleVar,
  serviceTypeVar,
  statusVar,
  syncVar,
  type Tone,
  toneVar,
} from './tone';

const toneBadgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 rounded-full border font-medium whitespace-nowrap leading-none [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        soft: 'tone-soft',
        solid: 'tone-solid',
        outline: 'tone-outline',
        /** Só o ponto colorido e o texto, sem fundo: para tabelas densas. */
        dot: 'border-transparent bg-transparent px-0! text-foreground',
        /** Só o texto colorido. */
        text: 'tone-text border-transparent bg-transparent px-0!',
      },
      size: {
        sm: 'h-5 px-1.5 text-[0.6875rem] [&>svg]:size-3',
        md: 'h-6 px-2 text-xs [&>svg]:size-3.5',
        lg: 'h-7 px-2.5 text-sm [&>svg]:size-4',
      },
    },
    defaultVariants: { variant: 'soft', size: 'md' },
  },
);

export type ToneBadgeVariant = NonNullable<VariantProps<typeof toneBadgeVariants>['variant']>;
export type BadgeSize = NonNullable<VariantProps<typeof toneBadgeVariants>['size']>;

export interface ToneBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Tom genérico; ignorado se `toneClass` vier. */
  tone?: Tone;
  /** Classe que define --tone (ex.: statusVar.open). */
  toneClass?: string;
  variant?: ToneBadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon;
  /** Esconde o ícone (o texto continua). */
  hideIcon?: boolean;
  /** Só o ícone, com o texto como rótulo acessível e dica. */
  iconOnly?: boolean;
  label: string;
}

/** Selo genérico por tom. Base de todos os outros. */
export function ToneBadge({
  tone = 'neutral',
  toneClass,
  variant = 'soft',
  size = 'md',
  icon: Icon,
  hideIcon,
  iconOnly,
  label,
  className,
  ...props
}: ToneBadgeProps) {
  const showIcon = Icon && !hideIcon;
  return (
    <span
      data-slot="tone-badge"
      className={cn(
        toneBadgeVariants({ variant, size }),
        toneClass ?? toneVar[tone],
        iconOnly && 'aspect-square justify-center px-0',
        className,
      )}
      {...(iconOnly ? { role: 'img', 'aria-label': label, title: label } : {})}
      {...props}
    >
      {variant === 'dot' && !showIcon && <span aria-hidden className="tone-fill size-2 rounded-full" />}
      {showIcon && <Icon aria-hidden className={cn(variant === 'dot' && 'tone-text')} />}
      {!iconOnly && label}
    </span>
  );
}

type DomainBadgeProps = Omit<ToneBadgeProps, 'label' | 'tone' | 'toneClass' | 'icon'>;

const statusIcon: Record<OrderStatus, LucideIcon> = {
  open: CircleDashed,
  in_progress: Play,
  pending_approval: Hourglass,
  rejected: CircleX,
  approved: CircleCheck,
  cancelled: Ban,
};

/** Status da O.S. (ciclo da spec). */
export function OrderStatusBadge({ status, ...props }: DomainBadgeProps & { status: OrderStatus }) {
  return (
    <ToneBadge toneClass={statusVar[status]} icon={statusIcon[status]} label={t(`ui.status.${status}`)} {...props} />
  );
}

const priorityIcon: Record<OrderPriority, LucideIcon> = {
  low: ArrowDown,
  normal: Minus,
  high: ArrowUp,
  urgent: ChevronsUp,
};

/** Prioridade. Urgente sai sólido por padrão, para saltar na lista. `long` usa "Prioridade alta". */
export function PriorityBadge({
  priority,
  long,
  variant,
  ...props
}: DomainBadgeProps & { priority: OrderPriority; long?: boolean }) {
  return (
    <ToneBadge
      toneClass={priorityVar[priority]}
      icon={priorityIcon[priority]}
      variant={variant ?? (priority === 'urgent' ? 'solid' : 'soft')}
      label={t(long ? `ui.priorityLong.${priority}` : `ui.priority.${priority}`)}
      {...props}
    />
  );
}

const serviceTypeIcon: Record<ServiceType, LucideIcon> = {
  installation: Cctv,
  maintenance: Wrench,
  technical_visit: ClipboardList,
};

/** Tipo de serviço. */
export function ServiceTypeBadge({ type, variant = 'outline', ...props }: DomainBadgeProps & { type: ServiceType }) {
  return (
    <ToneBadge
      toneClass={serviceTypeVar[type]}
      icon={serviceTypeIcon[type]}
      variant={variant}
      label={t(`ui.serviceType.${type}`)}
      {...props}
    />
  );
}

const roleIcon: Record<MemberRole, LucideIcon> = { owner: ShieldCheck, manager: Building, technician: HardHat };

/** Papel do membro. */
export function RoleBadge({ role, ...props }: DomainBadgeProps & { role: MemberRole }) {
  return <ToneBadge toneClass={roleVar[role]} icon={roleIcon[role]} label={t(`ui.role.${role}`)} {...props} />;
}

const reviewIcon: Record<ReviewStatus, LucideIcon> = {
  pending: Hourglass,
  approved: CircleCheck,
  rejected: CircleX,
  voided: Ban,
};

/** Estado da revisão de uma tentativa. */
export function ReviewStatusBadge({ status, ...props }: DomainBadgeProps & { status: ReviewStatus }) {
  return (
    <ToneBadge toneClass={reviewVar[status]} icon={reviewIcon[status]} label={t(`ui.review.${status}`)} {...props} />
  );
}

/** Origem da foto (câmera do app ou galeria). Câmera é neutra; galeria chama atenção de leve. */
export function PhotoSourceBadge({ source, ...props }: DomainBadgeProps & { source: PhotoSource }) {
  return (
    <ToneBadge
      tone={source === 'camera' ? 'neutral' : 'warning'}
      icon={source === 'camera' ? Camera : Image}
      label={t(`ui.photoSource.${source}`)}
      {...props}
    />
  );
}

/** Alerta da prova fotográfica (04). Rótulo curto no selo; o texto completo vai na dica (title). */
export function AlertBadge({ code, ...props }: DomainBadgeProps & { code: PhotoAlert | ExecutionAlert }) {
  return (
    <ToneBadge
      toneClass={alertVar[code]}
      icon={TriangleExclamationPoint}
      label={t(`ui.alertShort.${code}`)}
      title={t(`alerts.${code}`)}
      {...props}
    />
  );
}

/** Atrasada (03, R6: calculada, não é status). */
export function OverdueBadge(props: DomainBadgeProps) {
  return (
    <ToneBadge toneClass={flagVar.overdue} icon={ClockExclamationPoint} label={t('ui.badge.overdue')} {...props} />
  );
}

/** "Sem técnico": O.S. em andamento sem atribuição ativa. */
export function UnassignedBadge(props: DomainBadgeProps) {
  return <ToneBadge toneClass={flagVar.unassigned} icon={UserRoundX} label={t('ui.badge.unassigned')} {...props} />;
}

/** Complemento tardio não visto (04, R11). Com `count`, mostra a quantidade. */
export function LateSupplementBadge({ count, ...props }: DomainBadgeProps & { count?: number }) {
  const label = t('ui.badge.lateSupplement');
  return (
    <ToneBadge
      toneClass={flagVar.lateSupplement}
      icon={FilePlus}
      label={count && count > 1 ? `${label} · ${count}` : label}
      {...props}
    />
  );
}

/** "Enviada · na fila": envio novo da O.S. ainda no aparelho do técnico (docs/queue.md). */
export function QueuedBadge(props: DomainBadgeProps) {
  return <ToneBadge toneClass={syncVar.pending} icon={Clock} label={t('ui.badge.queued')} {...props} />;
}

/** "Nova": O.S. ainda não aberta neste aparelho (04). Ponto sólido, chamativo. */
export function NewBadge({ variant = 'solid', ...props }: DomainBadgeProps) {
  return <ToneBadge toneClass={flagVar.new} variant={variant} label={t('ui.badge.new')} {...props} />;
}

/** Contador redondo para navegação e abas (ex.: itens na fila). Some com 0. */
export function CountBadge({
  count,
  tone = 'danger',
  max = 99,
  className,
  ...props
}: { count: number; tone?: Tone; max?: number } & React.ComponentProps<'span'>) {
  if (count <= 0) return null;
  return (
    <span
      data-slot="count-badge"
      className={cn(
        'tone-solid inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums leading-none',
        toneVar[tone],
        className,
      )}
      {...props}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
