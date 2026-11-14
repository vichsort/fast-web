// Seletor de data (prazo da O.S., que o banco recebe como data: 03, R5) e de período (filtro de prazo, auditoria).
// Valores como 'AAAA-MM-DD', no calendário da empresa: "hoje" é calculado no fuso dela, não no do aparelho.
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import * as React from 'react';
import { ptBR } from 'react-day-picker/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { calendarDay, formatDateShort } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: string;
  to: string;
}

export type PeriodPreset = 'today' | 'tomorrow' | 'next7' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth';

/** 'AAAA-MM-DD' ↔ Date local (o calendário trabalha com o dia local do aparelho). */
const toDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};
const toDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (day: string, n: number) => {
  const date = toDate(day);
  date.setDate(date.getDate() + n);
  return toDay(date);
};

/** Período de um atalho, a partir de hoje no fuso da empresa. */
export function presetRange(preset: PeriodPreset, timeZone: string, now: Date = new Date()): DateRange {
  const today = calendarDay(now, timeZone);
  const date = toDate(today);
  const monthStart = toDay(new Date(date.getFullYear(), date.getMonth(), 1));
  const monthEnd = toDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'tomorrow':
      return { from: addDays(today, 1), to: addDays(today, 1) };
    case 'next7':
      return { from: today, to: addDays(today, 6) };
    case 'last7':
      return { from: addDays(today, -6), to: today };
    case 'last30':
      return { from: addDays(today, -29), to: today };
    case 'thisMonth':
      return { from: monthStart, to: monthEnd };
    case 'lastMonth':
      return {
        from: toDay(new Date(date.getFullYear(), date.getMonth() - 1, 1)),
        to: toDay(new Date(date.getFullYear(), date.getMonth(), 0)),
      };
  }
}

/** "13 nov." a partir de 'AAAA-MM-DD' (meio-dia UTC, sem risco de virar o dia). */
const dayLabel = (day: string) => formatDateShort(`${day}T12:00:00Z`, 'UTC');

export function formatRange(range: DateRange): string {
  return range.from === range.to
    ? dayLabel(range.from)
    : t('ui.period.range', { from: dayLabel(range.from), to: dayLabel(range.to) });
}

export interface PeriodPickerProps {
  value: DateRange | null;
  onValueChange: (value: DateRange | null) => void;
  timeZone: string;
  now?: Date;
  presets?: PeriodPreset[];
  /** Prefixo no botão (ex.: "Prazo"). */
  label?: string;
  placeholder?: string;
  className?: string;
}

/** Período com atalhos (hoje, próximos 7 dias, este mês…) e calendário de intervalo. */
export function PeriodPicker({
  value,
  onValueChange,
  timeZone,
  now,
  presets = ['today', 'next7', 'thisMonth', 'lastMonth'],
  label,
  placeholder,
  className,
}: PeriodPickerProps) {
  const [open, setOpen] = React.useState(false);
  const text = value ? formatRange(value) : (placeholder ?? t('ui.period.placeholder'));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn('min-w-36 justify-between font-normal', value && 'border-ring/60 bg-accent/40', className)}
          />
        }
      >
        <CalendarDays className="text-muted-foreground" />
        <span className="flex-1 truncate text-left">{label ? `${label}: ${text}` : text}</span>
        <ChevronDown className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-wrap gap-1 border-b p-2 sm:w-40 sm:flex-col sm:border-r sm:border-b-0">
            {presets.map((preset) => (
              <Button
                key={preset}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  onValueChange(presetRange(preset, timeZone, now));
                  setOpen(false);
                }}
              >
                {t(`ui.period.${preset}`)}
              </Button>
            ))}
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground"
                onClick={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
              >
                <X />
                {t('ui.actions.clear')}
              </Button>
            )}
          </div>
          <Calendar
            mode="range"
            locale={ptBR}
            numberOfMonths={1}
            defaultMonth={value ? toDate(value.from) : toDate(calendarDay(now ?? new Date(), timeZone))}
            selected={value ? { from: toDate(value.from), to: toDate(value.to) } : undefined}
            onSelect={(range) => {
              if (!range?.from) return onValueChange(null);
              onValueChange({ from: toDay(range.from), to: toDay(range.to ?? range.from) });
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface DatePickerProps {
  /** 'AAAA-MM-DD' ou null (sem data). */
  value: string | null;
  onValueChange: (value: string | null) => void;
  timeZone: string;
  now?: Date;
  placeholder?: string;
  /** Mostra "Sem prazo" para limpar (o prazo é opcional: 03, R4). */
  clearable?: boolean;
  /** Bloqueia dias antes de hoje. */
  disablePast?: boolean;
  id?: string;
  className?: string;
  'aria-invalid'?: boolean;
}

/** Data única com atalhos "Hoje" e "Amanhã" (prazo da O.S.). */
export function DatePicker({
  value,
  onValueChange,
  timeZone,
  now,
  placeholder,
  clearable = true,
  disablePast,
  id,
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const today = calendarDay(now ?? new Date(), timeZone);
  const pick = (day: string | null) => {
    onValueChange(day);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            aria-invalid={props['aria-invalid']}
            className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground', className)}
          />
        }
      >
        <CalendarDays />
        {value ? dayLabel(value) : (placeholder ?? t('ui.period.datePlaceholder'))}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <div className="flex gap-1 border-b p-2">
          <Button variant="ghost" size="sm" onClick={() => pick(today)}>
            {t('ui.period.today')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => pick(addDays(today, 1))}>
            {t('ui.period.tomorrow')}
          </Button>
          {clearable && (
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => pick(null)}>
              {t('ui.badge.noDueDate')}
            </Button>
          )}
        </div>
        <Calendar
          mode="single"
          locale={ptBR}
          defaultMonth={toDate(value ?? today)}
          selected={value ? toDate(value) : undefined}
          disabled={disablePast ? { before: toDate(today) } : undefined}
          onSelect={(date) => pick(date ? toDay(date) : null)}
        />
      </PopoverContent>
    </Popover>
  );
}
