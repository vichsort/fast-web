// Linha do tempo genérica e o adaptador do histórico da O.S. (service_order_history, eventos do 03 e do 04).
import {
  Ban,
  CircleCheck,
  CircleX,
  ClipboardList,
  Eye,
  FilePlus,
  type LucideIcon,
  MapPin,
  Package,
  PencilLine,
  Play,
  Plus,
  Send,
  UserRoundMinus,
  UserRoundPlus,
} from 'lucide-react';
import type * as React from 'react';
import type { OrderPriority, ServiceType } from '@/lib/enums';
import { formatDate, formatDateTime, formatRelative, formatWeekday } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { flagVar, statusVar, type Tone, toneVar } from './tone';

export interface TimelineEntry {
  id: string;
  icon: LucideIcon;
  /** Classe que define --tone do marcador. */
  toneClass?: string;
  /** Nome de quem fez (vai em negrito antes do título); `null` = sistema. */
  actor?: string | null;
  title: React.ReactNode;
  /** ISO 8601. */
  at: string;
  /** Detalhes em texto menor (mudanças de campos). */
  details?: React.ReactNode;
  /** Citação destacada (motivo do cancelamento, comentário da rejeição). */
  quote?: string;
}

export interface TimelineProps extends React.ComponentProps<'ol'> {
  entries: TimelineEntry[];
  timeZone: string;
  now?: Date;
  /** Separa por dia, com o dia no cabeçalho. */
  groupByDay?: boolean;
  /** Mais nova primeiro. */
  reverse?: boolean;
  density?: 'compact' | 'comfortable';
}

/** Linha do tempo vertical: marcador por tipo, autor, ação, horário e detalhes. */
export function Timeline({
  entries,
  timeZone,
  now,
  groupByDay,
  reverse,
  density = 'comfortable',
  className,
  ...props
}: TimelineProps) {
  const list = reverse ? [...entries].reverse() : entries;
  let lastDay = '';
  return (
    <ol data-slot="timeline" className={cn('flex flex-col', className)} {...props}>
      {list.map((entry, index) => {
        const day = formatDate(entry.at, timeZone);
        const showDay = groupByDay && day !== lastDay;
        lastDay = day;
        const Icon = entry.icon;
        const last = index === list.length - 1;
        return (
          <li key={entry.id} className="flex flex-col">
            {showDay && (
              <div className="mb-2 pt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:pt-0">
                {formatWeekday(entry.at, timeZone)}
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'tone-soft flex shrink-0 items-center justify-center rounded-full border',
                    density === 'compact' ? 'size-6' : 'size-7',
                    entry.toneClass ?? toneVar.neutral,
                  )}
                >
                  <Icon aria-hidden className={density === 'compact' ? 'size-3' : 'size-3.5'} />
                </span>
                {!last && <span aria-hidden className="w-px flex-1 bg-border" />}
              </div>
              <div
                className={cn(
                  'flex min-w-0 flex-1 flex-col gap-1',
                  last ? 'pb-0' : density === 'compact' ? 'pb-3' : 'pb-5',
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm leading-snug">
                    {entry.actor !== undefined && (
                      <span className="font-semibold">{entry.actor ?? t('ui.history.system')} </span>
                    )}
                    <span className={cn(entry.actor === undefined && 'font-medium')}>{entry.title}</span>
                  </p>
                  <time
                    dateTime={entry.at}
                    title={formatDateTime(entry.at, timeZone)}
                    className="shrink-0 text-xs text-muted-foreground tabular-nums"
                  >
                    {formatRelative(entry.at, timeZone, now)}
                  </time>
                </div>
                {entry.details && <div className="text-xs text-muted-foreground">{entry.details}</div>}
                {entry.quote && (
                  <blockquote className="rounded-md border-l-2 bg-muted/60 px-3 py-1.5 text-sm whitespace-pre-line text-foreground/90">
                    {entry.quote}
                  </blockquote>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- histórico da O.S.

/** Um evento de service_order_history com o autor resolvido (HistoryView dos mocks satisfaz). */
export interface OrderHistoryEvent {
  id: string;
  event_type: string;
  created_at: string;
  metadata: unknown;
  actor: { id: string; full_name: string } | null;
}

type Meta = Record<string, unknown>;

const toneOf = (tone: Tone) => toneVar[tone];

const eventStyle: Record<string, { icon: LucideIcon; toneClass: string }> = {
  created: { icon: Plus, toneClass: toneOf('brand') },
  updated: { icon: PencilLine, toneClass: toneOf('neutral') },
  address_changed: { icon: MapPin, toneClass: toneOf('neutral') },
  materials_updated: { icon: Package, toneClass: toneOf('neutral') },
  assignee_added: { icon: UserRoundPlus, toneClass: toneOf('info') },
  assignee_removed: { icon: UserRoundMinus, toneClass: toneOf('muted') },
  cancelled: { icon: Ban, toneClass: statusVar.cancelled },
  started: { icon: Play, toneClass: statusVar.in_progress },
  submitted: { icon: Send, toneClass: statusVar.pending_approval },
  supplement_added: { icon: FilePlus, toneClass: flagVar.lateSupplement },
  approved: { icon: CircleCheck, toneClass: statusVar.approved },
  rejected: { icon: CircleX, toneClass: statusVar.rejected },
  supplements_acknowledged: { icon: Eye, toneClass: toneOf('success') },
};

function fieldValue(field: string, value: unknown, timeZone: string): string {
  if (value === null || value === undefined || value === '') return t('ui.history.empty');
  if (field === 'priority') return t(`ui.priority.${value as OrderPriority}`);
  if (field === 'service_type') return t(`ui.serviceType.${value as ServiceType}`);
  if (field === 'due_at') return formatDate(String(value), timeZone);
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

const fieldLabel = (field: string) =>
  ['title', 'instructions', 'priority', 'due_at', 'service_type'].includes(field)
    ? t(`ui.fields.${field as 'title'}`)
    : field;

/**
 * Converte o histórico da O.S. em entradas da Timeline. `personName` resolve os ids que vêm no metadata
 * (técnico atribuído ou tirado).
 */
export function orderHistoryEntries(
  events: OrderHistoryEvent[],
  { timeZone, personName }: { timeZone: string; personName: (id: string) => string },
): TimelineEntry[] {
  return events.map((e) => {
    const meta = (e.metadata ?? {}) as Meta;
    const style = eventStyle[e.event_type] ?? { icon: ClipboardList, toneClass: toneOf('neutral') };
    const base = { id: e.id, at: e.created_at, actor: e.actor?.full_name ?? null, ...style };
    const name = typeof meta.user_id === 'string' ? personName(meta.user_id) : '';
    switch (e.event_type) {
      case 'updated': {
        const changes = (meta.changes ?? {}) as Record<string, { from: unknown; to: unknown }>;
        const fields = Object.keys(changes);
        return {
          ...base,
          title: t('ui.history.updated', { fields: fields.map(fieldLabel).join(', ') }),
          details: (
            <ul className="flex flex-col gap-0.5">
              {fields.map((field) => (
                <li key={field}>
                  {t('ui.history.change', {
                    field: fieldLabel(field),
                    from: fieldValue(field, changes[field]?.from, timeZone),
                    to: fieldValue(field, changes[field]?.to, timeZone),
                  })}
                </li>
              ))}
            </ul>
          ),
        };
      }
      case 'address_changed': {
        const from = (meta.from ?? {}) as Meta;
        const to = (meta.to ?? {}) as Meta;
        return {
          ...base,
          title: t('ui.history.address_changed'),
          details: `${String(from.address ?? t('ui.history.empty'))} → ${String(to.address ?? t('ui.history.empty'))}`,
        };
      }
      case 'materials_updated':
        return {
          ...base,
          title: t('ui.history.materials_updated'),
          quote: typeof meta.to === 'string' ? meta.to : undefined,
        };
      case 'assignee_added':
        return { ...base, title: t('ui.history.assignee_added', { name }) };
      case 'assignee_removed': {
        const key =
          meta.cause === 'member_removed'
            ? 'ui.history.assignee_removed_member_removed'
            : meta.cause === 'role_changed'
              ? 'ui.history.assignee_removed_role_changed'
              : 'ui.history.assignee_removed';
        return { ...base, title: t(key, { name }) };
      }
      case 'cancelled':
        return { ...base, title: t('ui.history.cancelled'), quote: String(meta.reason ?? '') };
      case 'supplement_added':
        return {
          ...base,
          title: t(meta.converted_to_supplement ? 'ui.history.supplement_converted' : 'ui.history.supplement_added'),
        };
      case 'approved':
      case 'rejected':
        return {
          ...base,
          title: t(`ui.history.${e.event_type}`),
          quote: typeof meta.comment === 'string' ? meta.comment : undefined,
        };
      case 'supplements_acknowledged':
        return { ...base, title: t('ui.history.supplements_acknowledged', { count: Number(meta.count ?? 0) }) };
      case 'created':
      case 'started':
      case 'submitted':
        return { ...base, title: t(`ui.history.${e.event_type}`) };
      default:
        return { ...base, title: t('ui.history.unknown', { type: e.event_type }) };
    }
  });
}
