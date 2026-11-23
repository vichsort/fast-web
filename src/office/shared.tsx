// Peças pequenas compostas para as telas do escritório (Notice, ChoiceCards e useStayOpen são candidatas ao kit).
import { ArrowLeft, FlaskConical, type LucideIcon } from 'lucide-react';
import * as React from 'react';
import type { FilterOption } from '@/components/filter-bar';
import { ErrorState } from '@/components/states';
import { priorityVar, serviceTypeVar, statusVar, type Tone, toneVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { usingMocks } from '@/lib/data-source';
import {
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  type OrderPriority,
  type OrderStatus,
  SERVICE_TYPES,
  type ServiceType,
} from '@/lib/enums';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useOffice } from './session';

export const statusOptions: FilterOption<OrderStatus>[] = ORDER_STATUSES.map((s) => ({
  value: s,
  label: t(`ui.status.${s}`),
  toneClass: statusVar[s],
}));

export const priorityOptions: FilterOption<OrderPriority>[] = ORDER_PRIORITIES.map((p) => ({
  value: p,
  label: t(`ui.priority.${p}`),
  toneClass: priorityVar[p],
}));

export const serviceTypeOptions: FilterOption<ServiceType>[] = SERVICE_TYPES.map((s) => ({
  value: s,
  label: t(`ui.serviceType.${s}`),
  toneClass: serviceTypeVar[s],
}));

/** Telas só do owner (Empresa, Membros, Auditoria). O RLS e as Edge Functions recusariam o manager de qualquer forma. */
export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { isOwner } = useOffice();
  if (!isOwner) return <ErrorState title={t('office.common.ownerOnlyTitle')} code="forbidden" />;
  return children;
}

/** Registro inexistente ou de outra empresa (`not_found`), com volta para a lista. */
export function NotFound({ back }: { back: React.ReactElement }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <ErrorState title={t('office.common.notFoundTitle')} code="not_found" />
      <Button variant="outline" render={back} nativeButton={false}>
        <ArrowLeft />
        {t('office.common.backToList')}
      </Button>
    </div>
  );
}

export interface NoticeProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  tone?: Tone;
  toneClass?: string;
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

/** Faixa de aviso no tom (O.S. cancelada, complemento tardio, stale_review). */
export function Notice({
  tone = 'info',
  toneClass,
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: NoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        'tone-soft flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        toneClass ?? toneVar[tone],
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        {description && <div className="text-foreground/80">{description}</div>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** Interruptor de cenário do scratch (simula um caso que só a integração real produziria). Some na integração. */
export function ScratchScenario({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  if (!usingMocks) return null;
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: o Switch do Base UI é o controle dentro do label
    <label className="tone-soft flex cursor-pointer items-start gap-3 rounded-lg border border-dashed px-3 py-2.5 text-xs [--tone:var(--tone-progress)]">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{t('office.common.scenarioTitle')}</span>
        <span className="text-foreground/80">{label}</span>
        {hint && <span className="text-foreground/60">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

/** Classe de link de texto (O.S., cliente) dentro de tabelas e listas. */
export const textLink = 'font-medium underline-offset-4 hover:underline';

/**
 * `p_id` de uma criação (api.md, idempotência): um por abertura do diálogo, o mesmo em cada nova tentativa, para a
 * resposta perdida não virar um registro duplicado.
 */
export function useCreateId(open: boolean): string {
  const [id, setId] = React.useState(() => crypto.randomUUID());
  React.useEffect(() => {
    if (open) setId(crypto.randomUUID());
  }, [open]);
  return id;
}

/**
 * Diálogo controlado que não fecha quando o envio falha (campos obrigatórios, erro de regra). Os diálogos do kit fecham
 * quando o `onSubmit` resolve; chamar `stayOpen()` antes de resolver ignora esse fechamento.
 */
export function useStayOpen(onOpenChange: (open: boolean) => void) {
  const stay = React.useRef(false);
  const handle = React.useCallback(
    (next: boolean) => {
      if (!next && stay.current) {
        stay.current = false;
        return;
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );
  const stayOpen = React.useCallback(() => {
    stay.current = true;
  }, []);
  return [handle, stayOpen] as const;
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Algo à direita do rótulo (selo, ícone). */
  aside?: React.ReactNode;
  disabled?: boolean;
}

/** Escolha única em cartões (tipo de serviço, endereço da O.S., papel do membro). */
export function ChoiceCards<T extends string>({
  value,
  onValueChange,
  options,
  columns = 1,
  invalid,
  'aria-label': ariaLabel,
  className,
}: {
  value: T | null;
  onValueChange: (value: T) => void;
  options: ChoiceOption<T>[];
  columns?: 1 | 2 | 3;
  invalid?: boolean;
  'aria-label'?: string;
  className?: string;
}) {
  return (
    <RadioGroup
      aria-label={ariaLabel}
      value={value ?? ''}
      onValueChange={(next) => onValueChange(next as T)}
      className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-3', className)}
    >
      {options.map((o) => (
        // biome-ignore lint/a11y/noLabelWithoutControl: o Radio do Base UI é o controle dentro do label
        <label
          key={o.value}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted/50',
            'has-data-checked:border-primary has-data-checked:bg-accent/50 has-data-checked:ring-1 has-data-checked:ring-primary',
            'has-disabled:cursor-not-allowed has-disabled:opacity-60',
            invalid && 'border-destructive/60',
          )}
        >
          <RadioGroupItem
            value={o.value}
            disabled={o.disabled}
            className="mt-0.5"
            aria-invalid={invalid || undefined}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-1.5 font-medium">
              {o.label}
              {o.aside}
            </span>
            {o.description && <span className="text-xs text-muted-foreground">{o.description}</span>}
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}
