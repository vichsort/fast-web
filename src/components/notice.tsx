// Aviso em destaque no tom do significado (O.S. cancelada, complemento tardio, recusa, fila com problema).
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { type Tone, toneVar } from '@/components/tone';
import { cn } from '@/lib/utils';

export interface NoticeProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  tone?: Tone;
  /** Classe que define --tone (ex.: statusVar.rejected); tem prioridade sobre `tone`. */
  toneClass?: string;
  icon?: LucideIcon;
  title: React.ReactNode;
  /** Botões ou links do aviso. */
  action?: React.ReactNode;
  /**
   * `inline` (computador): ícone pequeno e ação à direita, quebrando para baixo se faltar espaço; anunciado ao leitor
   * de tela (`role="status"`). `stacked` (celular): ícone maior e ação embaixo do texto, alinhada a ele.
   */
  layout?: 'inline' | 'stacked';
}

/** Faixa de aviso com ícone, título, texto (`children`) e ação. */
export function Notice({
  tone = 'info',
  toneClass,
  icon: Icon,
  title,
  action,
  layout = 'inline',
  className,
  children,
  ...props
}: NoticeProps) {
  const toneCls = toneClass ?? toneVar[tone];

  if (layout === 'stacked') {
    return (
      <div
        className={cn('tone-soft flex flex-col gap-3 rounded-xl border p-3.5 text-sm', toneCls, className)}
        {...props}
      >
        <div className="flex gap-3">
          {Icon && <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="font-semibold leading-snug">{title}</div>
            {children && <div className="text-foreground/90">{children}</div>}
          </div>
        </div>
        {action && <div className="flex flex-wrap gap-2 pl-8">{action}</div>}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        'tone-soft flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        toneCls,
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
