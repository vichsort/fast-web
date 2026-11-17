// Peças da vitrine: seção, bloco de demonstração e o fuso dos dados de exemplo.
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { MOCK_TIME_ZONE } from '@/mocks';

export const TZ = MOCK_TIME_ZONE;

export function ShowcaseSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-4 border-t pt-8 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Bloco com um rótulo técnico (nome do componente ou da variante). */
export function Demo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <code className="text-xs text-muted-foreground">{label}</code>
      {children}
    </div>
  );
}

export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}
