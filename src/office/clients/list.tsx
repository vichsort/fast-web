// Lista de clientes (02): busca por nome ou telefone, excluídos opcionais, cadastro no painel lateral.
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { FileUp, Plus, UsersRound } from 'lucide-react';
import * as React from 'react';
import { ToneBadge } from '@/components/badges';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { FilterBar, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatNumber, formatPhone, shortAddress } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { ClientListItem } from '@/mocks';
import { addressText } from '../mocks';
import { useClients } from '../queries';
import { NewClientPanel } from './client-form';

const route = getRouteApi('/office/clients');

const columns: DataTableColumn<ClientListItem>[] = [
  {
    id: 'name',
    header: t('office.clients.columns.name'),
    label: t('office.clients.columns.name'),
    sortValue: (c) => c.name,
    cell: (c) => (
      <div className="flex min-w-44 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5 font-medium">
          {c.name}
          {c.deleted_at && <ToneBadge tone="muted" size="sm" label={t('ui.badge.deleted')} />}
        </span>
        {c.notes && <span className="line-clamp-1 text-xs text-muted-foreground">{c.notes}</span>}
      </div>
    ),
  },
  {
    id: 'phone',
    header: t('office.clients.columns.phone'),
    hideBelow: 'sm',
    cell: (c) =>
      c.phone ? (
        <span className="whitespace-nowrap tabular-nums">{formatPhone(c.phone)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'address',
    header: t('office.clients.columns.address'),
    hideBelow: 'md',
    cell: (c) =>
      c.primary_address ? (
        <span className="line-clamp-1 text-sm">{shortAddress(addressText(c.primary_address))}</span>
      ) : (
        <span className="text-xs text-muted-foreground">{t('office.clients.noAddress')}</span>
      ),
  },
  {
    id: 'addresses',
    header: t('office.clients.columns.addresses'),
    label: t('office.clients.columns.addresses'),
    align: 'end',
    hideBelow: 'lg',
    className: 'w-24',
    sortValue: (c) => c.address_count,
    cell: (c) => <span className="tabular-nums text-muted-foreground">{c.address_count}</span>,
  },
  {
    id: 'open',
    header: t('office.clients.columns.openOrders'),
    label: t('office.clients.columns.openOrders'),
    align: 'end',
    className: 'w-28',
    sortValue: (c) => c.open_orders,
    cell: (c) =>
      c.open_orders > 0 ? (
        <ToneBadge tone="info" size="sm" label={formatNumber(c.open_orders)} />
      ) : (
        <span className="text-muted-foreground">0</span>
      ),
  },
];

export function ClientsPage() {
  const search = route.useSearch();
  const navigate = useNavigate({ from: '/office/clients' });
  const [creating, setCreating] = React.useState(false);
  const clients = useClients({ search: search.q, includeDeleted: search.deleted });
  const total = clients.data?.filter((c) => !c.deleted_at).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        size="lg"
        title={t('office.clients.title')}
        description={total !== undefined ? t('office.clients.description', { count: formatNumber(total) }) : undefined}
        actions={
          <>
            <Button variant="outline" render={<Link to="/office/clients/import" />} nativeButton={false}>
              <FileUp />
              {t('office.clients.import')}
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('office.clients.newClient')}
            </Button>
          </>
        }
      />
      <FilterBar
        search={
          <SearchInput
            value={search.q ?? ''}
            onValueChange={(q) => void navigate({ search: (prev) => ({ ...prev, q: q || undefined }), replace: true })}
            placeholder={t('office.clients.searchPlaceholder')}
            debounceMs={250}
          />
        }
        actions={
          // biome-ignore lint/a11y/noLabelWithoutControl: o Switch do Base UI é o controle dentro do label
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={search.deleted === true}
              onCheckedChange={(checked) =>
                void navigate({ search: (prev) => ({ ...prev, deleted: checked ? true : undefined }), replace: true })
              }
            />
            {t('office.common.showDeleted')}
          </label>
        }
      />
      {clients.isError ? (
        <ErrorState onRetry={() => void clients.refetch()} />
      ) : (
        <DataTable<ClientListItem>
          rows={clients.data ?? []}
          columns={columns}
          getRowId={(c) => c.id}
          rowLabel={(c) => c.name}
          loading={clients.isPending}
          pageSize={15}
          defaultSort={{ id: 'name', desc: false }}
          caption={t('office.clients.title')}
          rowClassName={(c) => (c.deleted_at ? 'opacity-60' : undefined)}
          onRowClick={(c) => void navigate({ to: '/office/clients/$clientId', params: { clientId: c.id } })}
          empty={
            search.q ? (
              <EmptyState size="sm" kind="filtered" />
            ) : (
              <EmptyState
                size="sm"
                icon={UsersRound}
                title={t('office.clients.emptyTitle')}
                description={t('office.clients.emptyDescription')}
              />
            )
          }
        />
      )}
      <NewClientPanel
        open={creating}
        onOpenChange={setCreating}
        onCreated={(clientId) => void navigate({ to: '/office/clients/$clientId', params: { clientId } })}
      />
    </div>
  );
}
