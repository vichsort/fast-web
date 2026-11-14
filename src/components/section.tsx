import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const sectionVariants = cva('group/section flex flex-col gap-(--space-gap) text-sm', {
  variants: {
    variant: {
      /** Cartão com borda (padrão). */
      card: 'rounded-xl border bg-card p-(--space-card) text-card-foreground shadow-xs',
      /** Fundo suave, sem borda: blocos secundários dentro de um cartão. */
      muted: 'rounded-xl bg-muted/60 p-(--space-card)',
      /** Só o título e o conteúdo, sem caixa. */
      plain: '',
    },
  },
  defaultVariants: { variant: 'card' },
});

export interface SectionProps
  extends Omit<React.ComponentProps<'section'>, 'title'>,
    VariantProps<typeof sectionVariants> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Ações no canto do cabeçalho (botão, link "ver todas"). */
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  density?: 'compact' | 'comfortable' | 'touch';
}

/** Seção ou cartão de conteúdo com cabeçalho opcional. */
export function Section({
  title,
  description,
  icon: Icon,
  actions,
  footer,
  variant,
  density,
  className,
  children,
  ...props
}: SectionProps) {
  const hasHeader = title || description || actions;
  return (
    <section
      data-slot="section"
      data-density={density}
      className={cn(sectionVariants({ variant }), className)}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
            <div className="flex min-w-0 flex-col gap-0.5">
              {title && <h2 className="font-heading text-base font-semibold leading-snug">{title}</h2>}
              {description && <p className="text-muted-foreground text-pretty">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      {children}
      {footer && <div className="-mx-(--space-card) -mb-(--space-card) border-t px-(--space-card) py-3">{footer}</div>}
    </section>
  );
}

/** Lista de pares rótulo/valor (dados da O.S., do cliente). Empilha no estreito e vira grade no largo. */
export function DetailList({ columns = 2, className, ...props }: React.ComponentProps<'dl'> & { columns?: 1 | 2 | 3 }) {
  return (
    <div className="@container/details">
      <dl
        data-slot="detail-list"
        className={cn(
          'grid grid-cols-1 gap-x-6 gap-y-3',
          columns >= 2 && '@md/details:grid-cols-2',
          columns === 3 && '@3xl/details:grid-cols-3',
          className,
        )}
        {...props}
      />
    </div>
  );
}

/** Um par da DetailList. `full` ocupa a linha inteira (textos longos). */
export function DetailItem({
  label,
  children,
  full,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', full && 'col-span-full', className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}
