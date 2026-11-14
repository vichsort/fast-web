// Tabela de dados genérica do escritório (O.S., clientes, membros, auditoria): ordenação, paginação simples,
// colunas que somem no estreito (container query), carregando e vazio. Os filtros ficam fora (FilterBar).
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from './states';

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Torna a coluna ordenável. `null` vai para o fim. */
  sortValue?: (row: T) => string | number | null;
  align?: 'start' | 'center' | 'end';
  /** Esconde a coluna quando a tabela é mais estreita que o ponto (container query). */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Largura fixa (ex.: 'w-24'). */
  className?: string;
  /** Rótulo do botão de ordenar, quando o cabeçalho não é texto. */
  label?: string;
}

export interface SortState {
  id: string;
  desc: boolean;
}

export interface DataTableProps<T> extends Omit<React.ComponentProps<'div'>, 'children'> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Ordenação controlada; sem ela, a tabela guarda a própria a partir de `defaultSort`. */
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Linhas por página; 0 desliga a paginação. */
  pageSize?: number;
  onRowClick?: (row: T) => void;
  /** Rótulo acessível de cada linha clicável (ex.: "O.S. #0042"). */
  rowLabel?: (row: T) => string;
  selectedId?: string | null;
  rowClassName?: (row: T) => string | undefined;
  loading?: boolean;
  /** Conteúdo quando não há linhas (padrão: EmptyState). */
  empty?: React.ReactNode;
  density?: 'compact' | 'comfortable';
  /** Legenda para leitores de tela. */
  caption?: string;
  stickyHeader?: boolean;
}

const hideClass = {
  sm: 'hidden @sm/table:table-cell',
  md: 'hidden @2xl/table:table-cell',
  lg: 'hidden @4xl/table:table-cell',
  xl: 'hidden @6xl/table:table-cell',
} as const;

const alignClass = { start: 'text-left', center: 'text-center', end: 'text-right' } as const;

function compare(a: string | number | null, b: string | number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

/** Tabela de dados genérica. */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  pageSize = 10,
  onRowClick,
  rowLabel,
  selectedId,
  rowClassName,
  loading,
  empty,
  density = 'comfortable',
  caption,
  stickyHeader,
  className,
  ...props
}: DataTableProps<T>) {
  const [innerSort, setInnerSort] = React.useState<SortState | null>(defaultSort);
  const sort = sortProp !== undefined ? sortProp : innerSort;
  const [page, setPage] = React.useState(0);

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.id);
    if (!column?.sortValue) return rows;
    const value = column.sortValue;
    const list = [...rows].sort((a, b) => compare(value(a), value(b)));
    return sort.desc ? list.reverse() : list;
  }, [rows, columns, sort]);

  const pages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const current = Math.min(page, pages - 1);
  const visible = pageSize > 0 ? sorted.slice(current * pageSize, (current + 1) * pageSize) : sorted;

  function toggleSort(id: string) {
    const next: SortState | null = sort?.id !== id ? { id, desc: false } : sort.desc ? null : { id, desc: true };
    if (sortProp === undefined) setInnerSort(next);
    onSortChange?.(next);
    setPage(0);
  }

  const cellPad = density === 'compact' ? 'px-3 py-1.5' : 'px-(--space-row-x) py-(--space-row-y)';

  return (
    <div data-slot="data-table" className={cn('@container/table flex flex-col gap-3', className)} {...props}>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full caption-bottom border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className={cn('bg-muted/60', stickyHeader && 'sticky top-0 z-10')}>
            <tr className="border-b">
              {columns.map((column) => {
                const active = sort?.id === column.id;
                const ariaSort = active ? (sort.desc ? 'descending' : 'ascending') : undefined;
                const SortIcon = active ? (sort.desc ? ArrowDown : ArrowUp) : ChevronsUpDown;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      'h-10 px-(--space-row-x) text-xs font-medium whitespace-nowrap text-muted-foreground',
                      alignClass[column.align ?? 'start'],
                      column.hideBelow && hideClass[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        aria-label={column.label ? t('ui.table.sortBy', { column: column.label }) : undefined}
                        className={cn(
                          '-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                          active && 'text-foreground',
                        )}
                      >
                        {column.header}
                        <SortIcon aria-hidden className={cn('size-3.5', !active && 'opacity-50')} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: Math.min(pageSize || 5, 6) }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas de carregando não têm id
                <tr key={i} className="border-b last:border-b-0">
                  {columns.map((column) => (
                    <td key={column.id} className={cn(cellPad, column.hideBelow && hideClass[column.hideBelow])}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              visible.map((row) => {
                const id = getRowId(row);
                const selected = selectedId === id;
                return (
                  <tr
                    key={id}
                    data-selected={selected || undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                    aria-selected={onRowClick ? selected : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'border-b transition-colors last:border-b-0',
                      onRowClick &&
                        'cursor-pointer outline-none hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:shadow-[inset_3px_0_0_var(--ring)]',
                      selected && 'bg-accent/60 hover:bg-accent/70',
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          cellPad,
                          'align-middle',
                          alignClass[column.align ?? 'start'],
                          column.hideBelow && hideClass[column.hideBelow],
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (empty ?? <EmptyState size="sm" kind="filtered" />)}
      </div>
      {pageSize > 0 && !loading && rows.length > pageSize && (
        <TablePagination page={current} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      )}
    </div>
  );
}

export interface TablePaginationProps extends React.ComponentProps<'nav'> {
  /** Página atual, a partir de 0. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Paginação simples: "11–20 de 45", anterior e próxima. Serve também para paginação no servidor. */
export function TablePagination({ page, pageSize, total, onPageChange, className, ...props }: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <nav
      aria-label={t('ui.table.page', { page: page + 1, pages })}
      className={cn('flex items-center justify-between gap-3 text-sm text-muted-foreground', className)}
      {...props}
    >
      <span className="tabular-nums">{t('ui.table.pageInfo', { from, to, total })}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 0}>
          <ChevronLeft />
          <span className="max-sm:sr-only">{t('ui.actions.previous')}</span>
        </Button>
        <span className="px-2 tabular-nums max-sm:hidden">{t('ui.table.page', { page: page + 1, pages })}</span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pages - 1}>
          <span className="max-sm:sr-only">{t('ui.actions.next')}</span>
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
