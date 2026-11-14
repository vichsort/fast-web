// Indicador de sincronização do técnico e cartão de item da fila/pendência (docs/queue.md). Só mostram estado:
// quem calcula é a fila (src/offline/queue); no scratch, os mocks.
import { useRender } from '@base-ui/react/use-render';
import {
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  CloudUpload,
  FilePlus,
  ListTodo,
  LogIn,
  type LucideIcon,
  OctagonX,
  Package,
  Play,
  RotateCw,
  Send,
  Trash,
  WifiOff,
} from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatOrderNumber, formatRelative, formatTime } from '@/lib/format';
import { errorMessage, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ToneBadge } from './badges';
import { syncVar } from './tone';

/** Estado que o indicador lê (SyncState dos mocks satisfaz). */
export interface SyncStatus {
  last_sync_at: string | null;
  pending: number;
  blocked: number;
  online: boolean;
  syncing: boolean;
  needs_login: boolean;
}

type SyncKind = 'login' | 'offline' | 'syncing' | 'pending' | 'blocked' | 'ok';

function kindOf(s: SyncStatus): SyncKind {
  if (s.needs_login) return 'login';
  if (!s.online) return 'offline';
  if (s.syncing) return 'syncing';
  if (s.pending > 0) return 'pending';
  if (s.blocked > 0) return 'blocked';
  return 'ok';
}

const kindStyle: Record<SyncKind, { icon: LucideIcon; toneClass: string }> = {
  login: { icon: LogIn, toneClass: syncVar.error },
  offline: { icon: WifiOff, toneClass: syncVar.offline },
  syncing: { icon: CloudUpload, toneClass: syncVar.busy },
  pending: { icon: Clock, toneClass: syncVar.pending },
  blocked: { icon: OctagonX, toneClass: syncVar.error },
  ok: { icon: CircleCheck, toneClass: syncVar.ok },
};

export interface SyncIndicatorProps extends Omit<React.ComponentProps<'div'>, 'onClick'> {
  status: SyncStatus;
  timeZone: string;
  /** `pill`: compacto no cabeçalho; `banner`: faixa de largura total abaixo do cabeçalho. */
  variant?: 'pill' | 'banner';
  /** Leva à tela de Pendências. */
  render?: React.ReactElement;
  onClick?: () => void;
}

/** "Atualizado às HH:MM", itens na fila, enviando, sem conexão, bloqueado ou login necessário. */
export function SyncIndicator({
  status,
  timeZone,
  variant = 'pill',
  render,
  onClick,
  className,
  ...props
}: SyncIndicatorProps) {
  const kind = kindOf(status);
  const { icon: Icon, toneClass } = kindStyle[kind];
  const time = status.last_sync_at ? formatTime(status.last_sync_at, timeZone) : null;
  const main = {
    login: t('ui.sync.needsLogin'),
    offline: t('ui.sync.offline'),
    syncing: t('ui.sync.syncing'),
    pending: t('ui.sync.pending', { count: status.pending }),
    blocked: t('ui.sync.blocked', { count: status.blocked }),
    ok: time ? t('ui.sync.upToDate', { time }) : t('ui.sync.offline'),
  }[kind];
  const secondary = [
    kind !== 'ok' && time ? t('ui.sync.upToDate', { time }) : null,
    kind === 'syncing' && status.pending > 0 ? t('ui.sync.pending', { count: status.pending }) : null,
    kind !== 'blocked' && kind !== 'login' && status.blocked > 0
      ? t('ui.sync.blocked', { count: status.blocked })
      : null,
  ].filter(Boolean);
  const interactive = Boolean(render || onClick);

  const content = (
    <>
      <span className={cn('relative flex shrink-0', kind === 'syncing' && 'animate-pulse')}>
        <Icon aria-hidden className={variant === 'pill' ? 'size-3.5' : 'size-4'} />
      </span>
      <span className="truncate font-medium">{main}</span>
      {variant === 'banner' && secondary.length > 0 && (
        <span className="truncate opacity-80">· {secondary.join(' · ')}</span>
      )}
      {variant === 'banner' && interactive && <ChevronRight aria-hidden className="ml-auto size-4 shrink-0" />}
    </>
  );

  const element = useRender({
    defaultTagName: 'div',
    render: render ?? (onClick ? <button type="button" onClick={onClick} /> : undefined),
    props: {
      role: interactive ? undefined : 'status',
      'aria-live': 'polite',
      title: variant === 'pill' && secondary.length > 0 ? secondary.join(' · ') : undefined,
      className: cn(
        'tone-soft flex min-w-0 items-center gap-1.5 border outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        toneClass,
        variant === 'pill' ? 'h-7 w-fit rounded-full px-2.5 text-xs' : 'w-full rounded-lg px-3 py-2 text-sm',
        interactive && 'cursor-pointer hover:brightness-95',
        className,
      ),
      children: content,
      ...props,
    },
  });
  return element;
}

/** Item da tela de Pendências (PendingItem dos mocks satisfaz). */
export interface PendingItemData {
  kind: 'start' | 'submit' | 'supplement' | 'materials';
  state: 'sending' | 'waiting' | 'queued' | 'refused' | 'blocked';
  order_number: number;
  order_title: string;
  created_at: string;
  next_attempt_at: string | null;
  refusal: string | null;
  error: string | null;
  photos: { done: number; total: number } | null;
}

const kindIcon: Record<PendingItemData['kind'], LucideIcon> = {
  start: Play,
  submit: Send,
  supplement: FilePlus,
  materials: Package,
};

const stateStyle: Record<PendingItemData['state'], { icon: LucideIcon; toneClass: string }> = {
  sending: { icon: CloudUpload, toneClass: syncVar.busy },
  waiting: { icon: WifiOff, toneClass: syncVar.pending },
  queued: { icon: ListTodo, toneClass: syncVar.offline },
  refused: { icon: CircleX, toneClass: syncVar.error },
  blocked: { icon: OctagonX, toneClass: syncVar.error },
};

export interface PendingItemCardProps extends React.ComponentProps<'article'> {
  item: PendingItemData;
  timeZone: string;
  now?: Date;
  /** "Tentar agora" (esperando rede ou bloqueado). */
  onRetry?: () => void;
  /** "Descartar" o rascunho recusado (pede confirmação na tela). */
  onDiscard?: () => void;
  /** "Dispensar" a recusa de início ou materiais. */
  onDismiss?: () => void;
  /** Abre a O.S. ou o rascunho. */
  onOpen?: () => void;
}

/** Cartão de um item da fila: tipo, O.S., estado, progresso das fotos, motivo da recusa e ações. */
export function PendingItemCard({
  item,
  timeZone,
  now,
  onRetry,
  onDiscard,
  onDismiss,
  onOpen,
  className,
  ...props
}: PendingItemCardProps) {
  const KindIcon = kindIcon[item.kind];
  const state = stateStyle[item.state];
  const problem = item.state === 'refused' || item.state === 'blocked';
  return (
    <article
      data-slot="pending-item"
      data-state={item.state}
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-(--space-card) text-card-foreground shadow-xs',
        problem && 'tone-wash border-[color-mix(in_oklch,var(--tone)_35%,var(--border))]',
        state.toneClass,
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <KindIcon aria-hidden className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t(`ui.queue.kind.${item.kind}`)}</span>
            <ToneBadge
              toneClass={state.toneClass}
              icon={state.icon}
              size="sm"
              label={t(`ui.queue.state.${item.state}`)}
              className={cn(item.state === 'sending' && '[&>svg]:animate-pulse')}
            />
          </div>
          <span className="truncate text-sm text-muted-foreground">
            <span className="font-medium text-foreground/85 tabular-nums">{formatOrderNumber(item.order_number)}</span>{' '}
            {item.order_title}
          </span>
          <span className="text-xs text-muted-foreground">
            {t('ui.queue.createdAt', { time: formatRelative(item.created_at, timeZone, now) })}
            {item.state === 'waiting' && item.next_attempt_at && (
              <> · {t('ui.queue.nextAttempt', { time: formatRelative(item.next_attempt_at, timeZone, now) })}</>
            )}
          </span>
        </div>
      </div>

      {item.photos && item.state === 'sending' && (
        <Progress
          value={(item.photos.done / Math.max(1, item.photos.total)) * 100}
          aria-label={t('ui.queue.sendingPhotos', item.photos)}
          className="gap-1.5"
        >
          <span className="text-xs text-muted-foreground tabular-nums">{t('ui.queue.sendingPhotos', item.photos)}</span>
        </Progress>
      )}

      {item.state === 'refused' && item.refusal && (
        <p className="tone-text text-sm font-medium">{errorMessage(item.refusal)}</p>
      )}
      {item.state === 'blocked' && (
        <p className="text-sm">
          {t('ui.queue.blockedHint')}
          {item.error && <code className="ml-1.5 rounded bg-muted px-1 py-0.5 font-mono text-xs">{item.error}</code>}
        </p>
      )}

      {(onRetry || onDiscard || onDismiss || onOpen) && (
        <div className="flex flex-wrap justify-end gap-2">
          {onOpen && (
            <Button variant="ghost" size="sm" onClick={onOpen}>
              {t('ui.actions.open')}
            </Button>
          )}
          {onDismiss && (
            <Button variant="outline" size="sm" onClick={onDismiss}>
              {t('ui.actions.dismiss')}
            </Button>
          )}
          {onDiscard && (
            <Button variant="destructive" size="sm" onClick={onDiscard}>
              <Trash />
              {t('ui.actions.discard')}
            </Button>
          )}
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw />
              {t('ui.actions.tryNow')}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
