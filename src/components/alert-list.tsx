// Alertas da prova fotográfica por extenso, cada um no tom dele (resumo da revisão).
import type * as React from 'react';
import { AlertBadge } from '@/components/badges';
import { alertVar } from '@/components/tone';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExecutionAlert, PhotoAlert } from '@/photos/alerts';

export interface AlertListItem {
  code: PhotoAlert | ExecutionAlert;
  /** Texto embaixo do selo; sem ele, o texto longo do alerta (`alerts.<código>`). */
  text?: React.ReactNode;
}

/** Lista de alertas: selo curto e texto, num cartão suave no tom do alerta. Um item por código. */
export function AlertList({ alerts, className }: { alerts: AlertListItem[]; className?: string }) {
  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {alerts.map(({ code, text }) => (
        <li key={code} className={cn('tone-soft rounded-lg border px-3 py-2 text-xs', alertVar[code])}>
          <AlertBadge code={code} size="sm" variant="text" className="mb-0.5" />
          <p className="text-foreground/85">{text ?? t(`alerts.${code}`)}</p>
        </li>
      ))}
    </ul>
  );
}
