// Tentativas da O.S. (04), da mais nova para a mais antiga, cada uma num ExecutionCard. Usado no detalhe da O.S. do
// escritório e do técnico; o que muda entre eles (textos, fotos compactas, ação do cartão) vem por props.
import type * as React from 'react';
import { type AttemptData, ExecutionCard } from './execution-card';

export interface AttemptsSectionProps<A extends AttemptData> {
  title: React.ReactNode;
  hint?: React.ReactNode;
  /** Texto quando ainda não há tentativa. */
  empty: React.ReactNode;
  /** Na ordem de envio; a seção mostra da mais nova para a mais antiga. */
  attempts: A[];
  timeZone: string;
  compactPhotos?: (attempt: A) => boolean;
  actions?: (attempt: A) => React.ReactNode;
}

export function AttemptsSection<A extends AttemptData>({
  title,
  hint,
  empty,
  attempts,
  timeZone,
  compactPhotos,
  actions,
}: AttemptsSectionProps<A>) {
  const heading = <h2 className="font-heading text-base font-semibold">{title}</h2>;
  return (
    <section className="flex flex-col gap-3">
      {hint ? (
        <div className="flex flex-col gap-0.5">
          {heading}
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      ) : (
        heading
      )}
      {attempts.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        [...attempts]
          .reverse()
          .map((attempt) => (
            <ExecutionCard
              key={attempt.id}
              attempt={attempt}
              timeZone={timeZone}
              compactPhotos={compactPhotos?.(attempt)}
              actions={actions?.(attempt)}
            />
          ))
      )}
    </section>
  );
}
