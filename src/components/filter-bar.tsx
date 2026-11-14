// Barra de filtros e busca. No largo, os filtros ficam em linha; no estreito (container query), vão para um
// painel de baixo aberto pelo botão "Filtros". O estado é de quem usa (controlado).
import { Check, ChevronDown, ListFilter, Search, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CountBadge } from './badges';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  /** Quantidade mostrada ao lado (ex.: O.S. em cada status). */
  count?: number;
  /** Classe que define --tone (ex.: statusVar.open), para o ponto colorido. */
  toneClass?: string;
}

export interface FilterBarProps extends React.ComponentProps<'div'> {
  /** Campo de busca (SearchInput). */
  search?: React.ReactNode;
  /** Filtros (FilterSelect, MultiFilter, PeriodPicker…). Repetidos no painel do estreito. */
  filters?: React.ReactNode;
  /** Quantos filtros estão ativos (mostra no botão e habilita "Limpar"). */
  activeCount?: number;
  onClear?: () => void;
  /** Botões à direita (ex.: "Nova O.S."). */
  actions?: React.ReactNode;
}

/** Barra de busca e filtros. */
export function FilterBar({ search, filters, activeCount = 0, onClear, actions, className, ...props }: FilterBarProps) {
  const [open, setOpen] = React.useState(false);
  const clear = onClear && activeCount > 0 && (
    <Button variant="ghost" size="sm" onClick={onClear}>
      <X />
      {t('ui.actions.clearFilters')}
    </Button>
  );
  return (
    <div data-slot="filter-bar" className={cn('@container/filters', className)} {...props}>
      <div className="flex flex-wrap items-center gap-2">
        {search && <div className="min-w-0 flex-1 basis-56">{search}</div>}
        {filters && (
          <>
            <div className="hidden flex-wrap items-center gap-2 @3xl/filters:flex">
              {filters}
              {clear}
            </div>
            <Button variant="outline" className="@3xl/filters:hidden" onClick={() => setOpen(true)}>
              <ListFilter />
              {t('ui.actions.filters')}
              <CountBadge count={activeCount} tone="brand" />
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetContent side="bottom" className="max-h-[85svh] rounded-t-2xl" showCloseButton={false}>
                <SheetHeader>
                  <SheetTitle>{t('ui.actions.filters')}</SheetTitle>
                  <SheetDescription className="sr-only">{t('ui.actions.filters')}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-3 overflow-y-auto px-4 *:w-full *:justify-between">{filters}</div>
                <SheetFooter className="flex-row">
                  {onClear && (
                    <Button variant="outline" className="flex-1" onClick={onClear} disabled={activeCount === 0}>
                      {t('ui.actions.clearFilters')}
                    </Button>
                  )}
                  <Button className="flex-1" onClick={() => setOpen(false)}>
                    {t('ui.actions.close')}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </>
        )}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export interface SearchInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'size'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Espera antes de avisar a mudança (ms). 0 avisa a cada tecla. */
  debounceMs?: number;
  size?: 'default' | 'lg';
}

/** Campo de busca com ícone e botão de limpar. */
export function SearchInput({
  value,
  onValueChange,
  debounceMs = 0,
  placeholder,
  size = 'default',
  className,
  ...props
}: SearchInputProps) {
  const [text, setText] = React.useState(value);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => setText(value), [value]);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  function change(next: string) {
    setText(next);
    clearTimeout(timer.current);
    if (debounceMs > 0) timer.current = setTimeout(() => onValueChange(next), debounceMs);
    else onValueChange(next);
  }

  return (
    <InputGroup className={cn(size === 'lg' && 'h-11', className)}>
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        inputMode="search"
        value={text}
        onChange={(event) => change(event.target.value)}
        placeholder={placeholder ?? t('ui.filters.searchPlaceholder')}
        aria-label={props['aria-label'] ?? placeholder ?? t('ui.actions.search')}
        className="[&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {text && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" onClick={() => change('')} aria-label={t('ui.actions.clear')}>
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

export interface FilterSelectProps<T extends string> {
  label: string;
  value: T | null;
  options: FilterOption<T>[];
  onValueChange: (value: T | null) => void;
  /** Texto da opção "todos" (padrão: "Todos"). */
  allLabel?: string;
  className?: string;
}

const ALL = '__all__';

/** Filtro de escolha única, com a opção "todos". */
export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onValueChange,
  allLabel,
  className,
}: FilterSelectProps<T>) {
  const all = allLabel ?? t('ui.filters.all');
  const items = [
    { value: ALL, label: `${label}: ${all}` },
    ...options.map((o) => ({ value: o.value, label: `${label}: ${o.label}` })),
  ];
  return (
    <Select<string>
      items={items}
      value={value ?? ALL}
      onValueChange={(next) => onValueChange(next === ALL || next === null ? null : (next as T))}
    >
      <SelectTrigger aria-label={label} className={cn('min-w-36', value && 'border-ring/60 bg-accent/40', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <OptionLabel option={o} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OptionLabel<T extends string>({ option }: { option: FilterOption<T> }) {
  return (
    <span className="flex w-full items-center gap-2">
      {option.toneClass && (
        <span aria-hidden className={cn('tone-fill size-2 shrink-0 rounded-full', option.toneClass)} />
      )}
      <span className="flex-1">{option.label}</span>
      {option.count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>}
    </span>
  );
}

export interface MultiFilterProps<T extends string> {
  label: string;
  values: T[];
  options: FilterOption<T>[];
  onValuesChange: (values: T[]) => void;
  className?: string;
}

/** Filtro de várias escolhas (ex.: status), num popover com caixas de seleção. */
export function MultiFilter<T extends string>({
  label,
  values,
  options,
  onValuesChange,
  className,
}: MultiFilterProps<T>) {
  const selected = options.filter((o) => values.includes(o.value));
  const summary =
    selected.length === 0
      ? t('ui.filters.all')
      : selected.length === 1
        ? (selected[0]?.label ?? '')
        : t('ui.combobox.selected', { count: selected.length });
  function toggle(value: T, checked: boolean) {
    onValuesChange(checked ? [...values, value] : values.filter((v) => v !== value));
  }
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'min-w-36 justify-between font-normal',
              selected.length > 0 && 'border-ring/60 bg-accent/40',
              className,
            )}
          />
        }
      >
        <span className="truncate">
          {label}: {summary}
        </span>
        <ChevronDown className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-1 p-1.5">
        {options.map((o) => {
          const checked = values.includes(o.value);
          return (
            // biome-ignore lint/a11y/noLabelWithoutControl: o Checkbox do Base UI é o controle dentro do label
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox checked={checked} onCheckedChange={(next) => toggle(o.value, next === true)} />
              <OptionLabel option={o} />
            </label>
          );
        })}
        {values.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-1 justify-start" onClick={() => onValuesChange([])}>
            <X />
            {t('ui.actions.clear')}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export interface FilterChipsProps<T extends string> extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  options: FilterOption<T>[];
  values: T[];
  onValuesChange: (values: T[]) => void;
  /** Uma escolha só (tocar em outra troca); a primeira opção pode ser "todas" com valor vazio. */
  single?: boolean;
  /** Rótulo acessível do grupo. */
  label: string;
}

/** Chips de filtro rápido, roláveis no celular (ex.: status em "Minhas O.S."). */
export function FilterChips<T extends string>({
  options,
  values,
  onValuesChange,
  single,
  label,
  className,
  ...props
}: FilterChipsProps<T>) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo de botões roláveis; fieldset quebraria o overflow
    <div
      role="group"
      aria-label={label}
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    >
      {options.map((o) => {
        const pressed = values.includes(o.value) || (single && values.length === 0 && o.value === '');
        return (
          <button
            key={o.value || 'all'}
            type="button"
            aria-pressed={pressed}
            onClick={() => {
              if (single) onValuesChange(o.value === '' ? [] : [o.value]);
              else onValuesChange(pressed ? values.filter((v) => v !== o.value) : [...values, o.value]);
            }}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-card px-3.5 text-sm font-medium whitespace-nowrap outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
              pressed && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {pressed && <Check aria-hidden className="size-3.5" />}
            {!pressed && o.toneClass && (
              <span aria-hidden className={cn('tone-fill size-2 rounded-full', o.toneClass)} />
            )}
            {o.label}
            {o.count !== undefined && (
              <span className={cn('tabular-nums', pressed ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
