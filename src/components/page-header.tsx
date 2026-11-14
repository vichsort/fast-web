import { ArrowLeft } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface PageHeaderProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Linha acima do título (ex.: número da O.S., trilha). */
  eyebrow?: React.ReactNode;
  /** Selos ou metadados abaixo do título. */
  meta?: React.ReactNode;
  /** Botões à direita (no celular, descem para baixo do título). */
  actions?: React.ReactNode;
  /**
   * Voltar: um elemento pronto (ex.: `<Link to="..." />` do router, recebe o visual do botão por `render`)
   * ou um callback.
   */
  back?: React.ReactElement | (() => void);
  /** `sm` para cabeçalhos dentro de painéis; `lg` para o topo das telas do escritório. */
  size?: 'sm' | 'md' | 'lg';
  /** Fica preso no topo ao rolar (útil no celular). */
  sticky?: boolean;
}

/** Cabeçalho de tela: voltar, título, descrição, selos e ações. */
export function PageHeader({
  title,
  description,
  eyebrow,
  meta,
  actions,
  back,
  size = 'md',
  sticky,
  className,
  ...props
}: PageHeaderProps) {
  const backLabel = t('ui.actions.back');
  return (
    <header
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        sticky &&
          'sticky top-0 z-20 -mx-4 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-2">
        {back &&
          (typeof back === 'function' ? (
            <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={back} aria-label={backLabel}>
              <ArrowLeft />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 shrink-0"
              aria-label={backLabel}
              render={back}
              nativeButton={false}
            >
              <ArrowLeft />
            </Button>
          ))}
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow && <div className="text-xs font-medium text-muted-foreground tabular-nums">{eyebrow}</div>}
          <h1
            className={cn(
              'font-heading font-semibold tracking-tight text-balance',
              size === 'sm' && 'text-base',
              size === 'md' && 'text-xl',
              size === 'lg' && 'text-2xl',
            )}
          >
            {title}
          </h1>
          {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
          {meta && <div className="mt-1 flex flex-wrap items-center gap-1.5">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
