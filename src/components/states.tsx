// Estados de tela: vazio, erro com tentar de novo, carregando (skeletons) e o aviso do scratch.
import { CircleX, FlaskConical, Inbox, type LucideIcon, RotateCw, SearchX, WifiOff } from 'lucide-react';
import type * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  icon?: LucideIcon;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Botões (ex.: "Nova O.S.", "Limpar filtros"). */
  action?: React.ReactNode;
  /** `filtered`: textos de "nenhum resultado" e ícone de busca. */
  kind?: 'default' | 'filtered';
  size?: 'sm' | 'md';
  /** Com borda tracejada, para ocupar o lugar de uma lista. */
  bordered?: boolean;
}

/** Estado vazio (lista sem itens ou sem resultado nos filtros). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  kind = 'default',
  size = 'md',
  bordered,
  className,
  ...props
}: EmptyStateProps) {
  const Icon = icon ?? (kind === 'filtered' ? SearchX : Inbox);
  return (
    <Empty
      className={cn(size === 'sm' ? 'gap-3 p-4' : 'p-8', bordered && 'border border-dashed', className)}
      {...props}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>
          {title ?? t(kind === 'filtered' ? 'ui.states.emptyFilteredTitle' : 'ui.states.emptyTitle')}
        </EmptyTitle>
        <EmptyDescription>
          {description ?? t(kind === 'filtered' ? 'ui.states.emptyFilteredDescription' : 'ui.states.emptyDescription')}
        </EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent className="flex-row justify-center">{action}</EmptyContent>}
    </Empty>
  );
}

export interface ErrorStateProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  title?: React.ReactNode;
  /** Código do catálogo (errors.md): vira o texto traduzido. */
  code?: string;
  /** Texto pronto; tem prioridade sobre `code`. */
  message?: React.ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  /** Sem conexão: ícone e textos próprios. */
  offline?: boolean;
  /** `inline`: faixa compacta dentro de um cartão ou lista. */
  layout?: 'block' | 'inline';
}

/** Erro ao carregar, com "tentar de novo". */
export function ErrorState({
  title,
  code,
  message,
  onRetry,
  retrying,
  offline,
  layout = 'block',
  className,
  ...props
}: ErrorStateProps) {
  const Icon = offline ? WifiOff : CircleX;
  const heading = title ?? t(offline ? 'ui.states.offlineTitle' : 'ui.states.errorTitle');
  const text = message ?? (code ? errorMessage(code) : offline ? t('ui.states.offlineDescription') : null);
  const retry = onRetry && (
    <Button variant="outline" size={layout === 'inline' ? 'sm' : 'default'} onClick={onRetry} disabled={retrying}>
      {retrying ? <Spinner aria-hidden /> : <RotateCw />}
      {retrying ? t('ui.states.retrying') : t('ui.actions.retry')}
    </Button>
  );
  if (layout === 'inline') {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm',
          className,
        )}
        {...props}
      >
        <Icon aria-hidden className="size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <span className="font-medium">{heading}</span>
          {text && <span className="text-muted-foreground"> · {text}</span>}
        </div>
        {retry}
      </div>
    );
  }
  return (
    <Empty role="alert" className={cn('p-8', className)} {...props}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{heading}</EmptyTitle>
        {text && <EmptyDescription>{text}</EmptyDescription>}
      </EmptyHeader>
      {retry && <EmptyContent>{retry}</EmptyContent>}
    </Empty>
  );
}

/** Lista carregando: cartões (celular), linhas (lista simples) ou tabela (escritório). */
export function LoadingList({
  count = 4,
  variant = 'card',
  columns = 5,
  className,
}: {
  count?: number;
  variant?: 'card' | 'row' | 'table';
  /** Só para `table`. */
  columns?: number;
  className?: string;
}) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <div role="status" aria-label={t('ui.states.loading')} className={cn('flex flex-col gap-3', className)}>
      {variant === 'card' &&
        items.map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      {variant === 'row' &&
        items.map((i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      {variant === 'table' && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex gap-4 border-b bg-muted/50 px-4 py-3">
            {Array.from({ length: columns }, (_, c) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: colunas de carregando não têm id
              <Skeleton key={c} className="h-3 flex-1" />
            ))}
          </div>
          {items.map((i) => (
            <div key={i} className="flex gap-4 border-b px-4 py-3.5 last:border-b-0">
              {Array.from({ length: columns }, (_, c) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: colunas de carregando não têm id
                <Skeleton key={c} className={cn('h-4 flex-1', c === 1 && 'flex-[2]')} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Detalhe carregando (cabeçalho, selos e blocos). */
export function LoadingDetail({ className }: { className?: string }) {
  return (
    <div role="status" aria-label={t('ui.states.loading')} className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-3/4" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Carregando no meio de um bloco (spinner e texto). */
export function LoadingInline({ label, className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Spinner aria-hidden />
      {label ?? t('ui.states.loading')}
    </div>
  );
}

/** Faixa de aviso do scratch visual: dados fictícios, nada é gravado. */
export function ScratchBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'tone-soft flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium [--tone:var(--tone-progress)]',
        className,
      )}
    >
      <FlaskConical aria-hidden className="size-4 shrink-0" />
      {t('ui.scratch.banner')}
    </div>
  );
}

/** Aviso de ação de exemplo (aprovar, enviar, salvar): mostra o efeito sem gravar. */
export function scratchToast(action: string) {
  toast.info(t('ui.scratch.toast', { action }));
}
