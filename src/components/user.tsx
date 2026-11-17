// Avatar com iniciais, chip de usuário e pilha de avatares (técnicos de uma O.S.).
import type * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MemberRole } from '@/lib/enums';
import { firstName, formatList, initials } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { RoleBadge } from './badges';
import { type Tone, toneVar } from './tone';

const avatarTones: Tone[] = ['info', 'progress', 'success', 'warning', 'brand', 'danger'];

function toneFor(seed: string): Tone {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return avatarTones[Math.abs(h) % avatarTones.length] ?? 'neutral';
}

const avatarSize = {
  xs: 'size-6 text-[0.5625rem] tracking-tighter',
  sm: 'size-7 text-[0.6875rem]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-base',
} as const;

export type AvatarSize = keyof typeof avatarSize;

export interface UserAvatarProps extends React.ComponentProps<'span'> {
  name: string;
  /** Semente da cor (padrão: o nome). Use o id para a cor não mudar se o nome mudar. */
  seed?: string;
  size?: AvatarSize;
  /** Esconde do leitor de tela quando o nome já está ao lado. */
  decorative?: boolean;
}

/** Avatar com iniciais e cor estável por pessoa. */
export function UserAvatar({ name, seed, size = 'md', decorative, className, ...props }: UserAvatarProps) {
  return (
    <span
      data-slot="user-avatar"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
      className={cn(
        'tone-soft inline-flex shrink-0 select-none items-center justify-center rounded-full border font-semibold uppercase',
        toneVar[toneFor(seed ?? name)],
        avatarSize[size],
        className,
      )}
      {...props}
    >
      {initials(name)}
    </span>
  );
}

export interface UserChipProps extends React.ComponentProps<'div'> {
  name: string;
  seed?: string;
  /** Linha de baixo (email, telefone, "Enviada há 2 h"). */
  subtitle?: React.ReactNode;
  memberRole?: MemberRole;
  /** Marca "Você". */
  isSelf?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** Avatar, nome e uma linha de apoio (e o papel, se vier). */
export function UserChip({
  name,
  seed,
  subtitle,
  memberRole,
  isSelf,
  size = 'md',
  className,
  ...props
}: UserChipProps) {
  return (
    <div data-slot="user-chip" className={cn('flex min-w-0 items-center gap-2.5', className)} {...props}>
      <UserAvatar name={name} seed={seed} size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'} decorative />
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn('truncate font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}>{name}</span>
          {isSelf && <span className="shrink-0 text-xs text-muted-foreground">({t('ui.badge.you')})</span>}
          {memberRole && <RoleBadge role={memberRole} size="sm" />}
        </div>
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  );
}

export interface AvatarStackProps extends React.ComponentProps<'div'> {
  people: { id: string; full_name: string }[];
  max?: number;
  size?: AvatarSize;
  /** Mostra os primeiros nomes ao lado ("Marcos e Diego"). */
  showNames?: boolean;
  /** Conteúdo quando a lista é vazia (ex.: <UnassignedBadge />). */
  empty?: React.ReactNode;
}

/** Pilha de avatares, com os nomes na dica. */
export function AvatarStack({
  people,
  max = 3,
  size = 'sm',
  showNames,
  empty = null,
  className,
  ...props
}: AvatarStackProps) {
  if (people.length === 0) return <>{empty}</>;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const names = formatList(people.map((p) => p.full_name));
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            data-slot="avatar-stack"
            className={cn('inline-flex min-w-0 items-center gap-2', className)}
            {...props}
          />
        }
      >
        <span className="sr-only">{names}</span>
        <span aria-hidden className="flex -space-x-1">
          {shown.map((p) => (
            <UserAvatar key={p.id} name={p.full_name} seed={p.id} size={size} decorative className="ring-2 ring-card" />
          ))}
          {rest > 0 && (
            <span
              aria-hidden
              className={cn(
                'inline-flex items-center justify-center rounded-full border bg-muted font-semibold text-muted-foreground ring-2 ring-card',
                avatarSize[size],
              )}
            >
              +{rest}
            </span>
          )}
        </span>
        {showNames && (
          <span aria-hidden className="truncate text-sm text-muted-foreground">
            {formatList(people.map((p) => firstName(p.full_name)))}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>{names}</TooltipContent>
    </Tooltip>
  );
}
