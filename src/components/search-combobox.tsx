// Combobox com busca (escolher cliente, técnicos). Uma ou várias escolhas; opcionalmente "Cadastrar 'texto'"
// (cadastro rápido de cliente no formulário da O.S., 03).
import { ChevronsUpDown, Plus, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { UserAvatar } from './user';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Segunda linha (telefone, endereço). */
  description?: string;
  /** Termos extras para a busca. */
  keywords?: string[];
  disabled?: boolean;
}

interface BaseProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Mostra avatar com iniciais (pessoas). */
  avatars?: boolean;
  /** Oferece "Cadastrar 'texto'" quando a busca não acha (ou sempre que houver texto). */
  onCreate?: (text: string) => void;
  loading?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string | null;
  onValueChange: (value: string | null) => void;
}

interface MultipleProps extends BaseProps {
  multiple: true;
  value: string[];
  onValueChange: (value: string[]) => void;
}

export type SearchComboboxProps = SingleProps | MultipleProps;

/** Combobox com busca, para uma ou várias escolhas. */
export function SearchCombobox(props: SearchComboboxProps) {
  const { options, placeholder, searchPlaceholder, emptyText, avatars, onCreate, loading, disabled, id, className } =
    props;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const selectedValues = props.multiple ? props.value : props.value ? [props.value] : [];
  const selected = options.filter((o) => selectedValues.includes(o.value));

  function select(value: string) {
    if (props.multiple) {
      props.onValueChange(
        props.value.includes(value) ? props.value.filter((v) => v !== value) : [...props.value, value],
      );
    } else {
      props.onValueChange(props.value === value ? null : value);
      setOpen(false);
    }
  }

  function remove(value: string) {
    if (props.multiple) props.onValueChange(props.value.filter((v) => v !== value));
    else props.onValueChange(null);
  }

  const trimmed = query.trim();
  const exact = options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase());

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={props['aria-invalid']}
            aria-label={props['aria-label']}
            disabled={disabled}
            className={cn('h-auto min-h-8 w-full justify-between py-1 font-normal', className)}
          />
        }
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-left">
          {selected.length === 0 && (
            <span className="truncate text-muted-foreground">{placeholder ?? t('ui.combobox.placeholder')}</span>
          )}
          {!props.multiple && selected[0] && (
            <span className="flex min-w-0 items-center gap-2">
              {avatars && <UserAvatar name={selected[0].label} seed={selected[0].value} size="xs" decorative />}
              <span className="truncate">{selected[0].label}</span>
            </span>
          )}
          {props.multiple &&
            selected.map((o) => (
              <span
                key={o.value}
                className="inline-flex h-6 items-center gap-1 rounded-full border bg-secondary py-0 pr-1 pl-1 text-xs font-medium"
              >
                {avatars && <UserAvatar name={o.label} seed={o.value} size="xs" decorative />}
                <span className={cn(!avatars && 'pl-1')}>{o.label}</span>
                {/* biome-ignore lint/a11y/useSemanticElements: botão dentro do gatilho (que já é um botão) */}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`${t('ui.actions.clear')} ${o.label}`}
                  className="inline-flex size-4 items-center justify-center rounded-full hover:bg-muted"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    remove(o.value);
                  }}
                >
                  <X className="size-3" />
                </span>
              </span>
            ))}
        </span>
        {loading ? (
          <Spinner aria-label={t('ui.states.loading')} />
        ) : (
          <ChevronsUpDown className="text-muted-foreground" />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder ?? t('ui.combobox.search')}
          />
          <CommandList>
            <CommandEmpty>{emptyText ?? t('ui.combobox.empty')}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isSelected = selectedValues.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.description ?? ''} ${(o.keywords ?? []).join(' ')} ${o.value}`}
                    disabled={o.disabled}
                    onSelect={() => select(o.value)}
                    data-checked={isSelected}
                  >
                    {avatars && <UserAvatar name={o.label} seed={o.value} size="sm" decorative />}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{o.label}</span>
                      {o.description && <span className="truncate text-xs text-muted-foreground">{o.description}</span>}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {onCreate && trimmed && !exact && (
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value={`__create__ ${trimmed}`}
                  onSelect={() => {
                    onCreate(trimmed);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Plus />
                  {t('ui.actions.create', { text: trimmed })}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
