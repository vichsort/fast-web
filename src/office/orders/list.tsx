import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { ClockExclamationPoint } from 'lucide-react';
import { FilterBar, FilterSelect, MultiFilter, SearchInput } from '@/components/filter-bar';
import { OrderTable } from '@/components/order-table';
import { PageHeader } from '@/components/page-header';
import { PeriodPicker } from '@/components/period-picker';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OfficeOrderListItem, OrderFilters } from '@/lib/views';
import { useClientNames, useOrders, useTechnicians } from '../queries';
import { useOffice } from '../session';
import { priorityOptions, serviceTypeOptions, statusOptions } from '../shared';
import type { OrdersSearch } from './search';

const route = getRouteApi('/office/orders');

export function OrdersPage() {
  const { timeZone } = useOffice();
  const search = route.useSearch();
  const navigate = useNavigate({ from: '/office/orders' });
  const technicians = useTechnicians();
  const clients = useClientNames();

  const filters: OrderFilters = {
    search: search.q,
    status: search.status,
    priority: search.priority ? [search.priority] : undefined,
    service_type: search.type ? [search.type] : undefined,
    technician_id: search.tech && search.tech !== 'none' ? search.tech : null,
    unassigned: search.tech === 'none' || undefined,
    client_id: search.client ?? null,
    due_from: search.from ?? null,
    due_to: search.to ?? null,
    overdue: search.overdue,
  };
  const orders = useOrders(filters);

  const set = (patch: Partial<OrdersSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const activeCount = [
    search.status?.length,
    search.priority,
    search.type,
    search.tech,
    search.client,
    search.from,
    search.overdue,
  ].filter(Boolean).length;
  const clear = () => void navigate({ search: search.q ? { q: search.q } : {}, replace: true });
  const filtered = activeCount > 0 || Boolean(search.q);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        size="lg"
        title={t('office.orders.title')}
        description={
          orders.data ? t('office.orders.description', { count: formatNumber(orders.data.length) }) : undefined
        }
      />
      <FilterBar
        search={
          <SearchInput
            value={search.q ?? ''}
            onValueChange={(q) => set({ q: q || undefined })}
            placeholder={t('office.orders.searchPlaceholder')}
            debounceMs={250}
          />
        }
        filters={
          <>
            <MultiFilter
              label={t('ui.filters.status')}
              values={search.status ?? []}
              options={statusOptions}
              onValuesChange={(status) => set({ status: status.length ? status : undefined })}
            />
            <FilterSelect
              label={t('ui.filters.priority')}
              value={search.priority ?? null}
              options={priorityOptions}
              onValueChange={(priority) => set({ priority: priority ?? undefined })}
            />
            <FilterSelect
              label={t('office.orders.type')}
              value={search.type ?? null}
              options={serviceTypeOptions}
              onValueChange={(type) => set({ type: type ?? undefined })}
            />
            <FilterSelect
              label={t('office.orders.technician')}
              value={search.tech ?? null}
              options={[
                { value: 'none', label: t('office.orders.noTechnician') },
                ...(technicians.data ?? []).map((p) => ({ value: p.id, label: p.full_name })),
              ]}
              onValueChange={(tech) => set({ tech: tech ?? undefined })}
            />
            <FilterSelect
              label={t('office.orders.client')}
              value={search.client ?? null}
              options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              onValueChange={(client) => set({ client: client ?? undefined })}
            />
            <PeriodPicker
              label={t('ui.filters.period')}
              value={search.from && search.to ? { from: search.from, to: search.to } : null}
              onValueChange={(range) => set({ from: range?.from, to: range?.to })}
              timeZone={timeZone}
            />
            <Toggle
              variant="outline"
              pressed={search.overdue === true}
              onPressedChange={(pressed) => set({ overdue: pressed ? true : undefined })}
            >
              <ClockExclamationPoint />
              {t('office.orders.overdueOnly')}
            </Toggle>
          </>
        }
        activeCount={activeCount}
        onClear={clear}
      />
      {orders.isError ? (
        <ErrorState onRetry={() => void orders.refetch()} />
      ) : (
        <OrderTable<OfficeOrderListItem>
          rows={orders.data ?? []}
          loading={orders.isPending}
          timeZone={timeZone}
          include={['number', 'title', 'status', 'priority', 'type', 'assignees', 'due']}
          pageSize={15}
          caption={t('office.orders.title')}
          onRowClick={(o) => void navigate({ to: '/office/orders/$orderId', params: { orderId: o.id } })}
          empty={
            filtered ? (
              <EmptyState
                size="sm"
                kind="filtered"
                action={
                  <Button variant="outline" size="sm" onClick={() => void navigate({ search: {}, replace: true })}>
                    {t('ui.actions.clearFilters')}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                size="sm"
                title={t('office.orders.emptyTitle')}
                description={t('office.orders.emptyDescription')}
              />
            )
          }
        />
      )}
    </div>
  );
}
