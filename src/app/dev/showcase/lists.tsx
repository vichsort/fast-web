// Vitrine: O.S. no celular, tabela de dados com filtros, seletores e contadores do dashboard.
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { AddressBlock } from '@/components/address-block';
import { OrderStatusBadge, PriorityBadge, RoleBadge, ServiceTypeBadge, ToneBadge } from '@/components/badges';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { SidePanel } from '@/components/dialogs';
import {
  FilterBar,
  FilterChips,
  type FilterOption,
  FilterSelect,
  MultiFilter,
  SearchInput,
} from '@/components/filter-bar';
import { OrderCard } from '@/components/order-card';
import { OrderTable } from '@/components/order-table';
import { DatePicker, type DateRange, PeriodPicker } from '@/components/period-picker';
import { SearchCombobox } from '@/components/search-combobox';
import { DetailItem, DetailList } from '@/components/section';
import { DASHBOARD_STATS, StatCard, StatGrid } from '@/components/stat-card';
import { EmptyState, LoadingList, scratchToast } from '@/components/states';
import { orderHistoryEntries, Timeline } from '@/components/timeline';
import { priorityVar, statusVar } from '@/components/tone';
import { Field, FieldLabel } from '@/components/ui/field';
import { UserChip } from '@/components/user';
import { ORDER_PRIORITIES, ORDER_STATUSES, type OrderPriority, type OrderStatus } from '@/lib/enums';
import { formatDate, formatDateTime, formatOrderNumber, formatPhone } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { AuditView, MemberView, OrderListItem } from '@/lib/views';
import {
  getDashboard,
  getOrder,
  getPerson,
  listAudit,
  listClients,
  listMembers,
  listMyOrders,
  listOrders,
  listTechnicians,
  MOCK_USER_IDS,
} from '@/mocks';
import { Demo, ShowcaseSection, TZ } from './frame';

const statusOptions: FilterOption<OrderStatus>[] = ORDER_STATUSES.map((s) => ({
  value: s,
  label: t(`ui.status.${s}`),
  toneClass: statusVar[s],
}));
const priorityOptions: FilterOption<OrderPriority>[] = ORDER_PRIORITIES.map((p) => ({
  value: p,
  label: t(`ui.priority.${p}`),
  toneClass: priorityVar[p],
}));

export function OrdersSection() {
  const [status, setStatus] = React.useState<string[]>([]);
  const mine = useQuery({ queryKey: ['mock', 'my-orders'], queryFn: () => listMyOrders(MOCK_USER_IDS.technician) });
  const all = mine.data ?? [];
  const chips: FilterOption<string>[] = [
    { value: '', label: t('ui.filters.all'), count: all.length },
    ...(['open', 'in_progress', 'pending_approval', 'rejected'] as const).map((s) => ({
      value: s,
      label: t(`ui.status.${s}`),
      count: all.filter((o) => o.status === s).length,
      toneClass: statusVar[s],
    })),
  ];
  const visible = status.length ? all.filter((o) => status.includes(o.status)) : all;
  return (
    <ShowcaseSection id="orders" title={t('ui.showcase.sections.orders')}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <Demo label="FilterChips single · OrderCard isNew">
          <FilterChips
            label={t('ui.filters.status')}
            options={chips}
            values={status}
            onValuesChange={setStatus}
            single
          />
          {mine.isPending ? (
            <LoadingList count={3} />
          ) : visible.length === 0 ? (
            <EmptyState kind="filtered" bordered size="sm" />
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  timeZone={TZ}
                  isNew={o.is_new}
                  onClick={() => scratchToast(t('ui.order.number', { number: formatOrderNumber(o.order_number) }))}
                />
              ))}
            </div>
          )}
        </Demo>
        <Demo label={t('ui.showcase.demo.cardStates')}>
          {all[0] && all[1] && (
            <div className="flex flex-col gap-3">
              <code className="text-xs text-muted-foreground">density="compact" · showAssignees</code>
              <OrderCard order={all[0]} timeZone={TZ} density="compact" showAssignees />
              <code className="text-xs text-muted-foreground">density="touch" · selected · hideStatus</code>
              <OrderCard order={all[1]} timeZone={TZ} density="touch" selected hideStatus />
            </div>
          )}
        </Demo>
      </div>
    </ShowcaseSection>
  );
}

export function TableSection() {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<OrderStatus[]>([]);
  const [priority, setPriority] = React.useState<OrderPriority | null>(null);
  const [technician, setTechnician] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<DateRange | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const filters = {
    search,
    status,
    priority: priority ? [priority] : [],
    technician_id: technician,
    due_from: period?.from,
    due_to: period?.to,
  };
  const orders = useQuery({ queryKey: ['mock', 'orders', filters], queryFn: () => listOrders(filters) });
  const technicians = useQuery({ queryKey: ['mock', 'technicians'], queryFn: () => listTechnicians() });
  const members = useQuery({
    queryKey: ['mock', 'members', 'all'],
    queryFn: () => listMembers({ includeRemoved: true }),
  });
  const audit = useQuery({ queryKey: ['mock', 'audit'], queryFn: () => listAudit() });
  const activeCount = [status.length > 0, priority, technician, period].filter(Boolean).length;
  const clear = () => {
    setStatus([]);
    setPriority(null);
    setTechnician(null);
    setPeriod(null);
  };

  return (
    <ShowcaseSection id="table" title={t('ui.showcase.sections.table')}>
      <Demo label="FilterBar + OrderTable (DataTable)">
        <FilterBar
          search={
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder={t('ui.filters.searchOrders')}
              debounceMs={200}
            />
          }
          filters={
            <>
              <MultiFilter
                label={t('ui.filters.status')}
                values={status}
                options={statusOptions}
                onValuesChange={setStatus}
              />
              <FilterSelect
                label={t('ui.filters.priority')}
                value={priority}
                options={priorityOptions}
                onValueChange={setPriority}
              />
              <FilterSelect
                label={t('ui.filters.technician')}
                value={technician}
                options={(technicians.data ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
                onValueChange={setTechnician}
              />
              <PeriodPicker label={t('ui.filters.period')} value={period} onValueChange={setPeriod} timeZone={TZ} />
            </>
          }
          activeCount={activeCount}
          onClear={clear}
        />
        <OrderTable<OrderListItem>
          rows={orders.data ?? []}
          loading={orders.isPending}
          timeZone={TZ}
          include={['number', 'title', 'client', 'status', 'priority', 'type', 'assignees', 'due']}
          pageSize={8}
          onRowClick={(o) => setOpenId(o.id)}
          selectedId={openId}
          caption={t('ui.showcase.demo.pageTitle')}
        />
      </Demo>
      <OrderPanel orderId={openId} onClose={() => setOpenId(null)} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Demo label={`DataTable · ${t('ui.showcase.demo.membersTable')}`}>
          <DataTable<MemberView>
            rows={members.data ?? []}
            loading={members.isPending}
            getRowId={(m) => m.id}
            columns={memberColumns}
            pageSize={0}
            density="compact"
            rowClassName={(m) => (m.deleted_at ? 'opacity-60' : undefined)}
          />
        </Demo>
        <Demo label={`DataTable · ${t('ui.showcase.demo.auditTable')}`}>
          <DataTable<AuditView>
            rows={audit.data ?? []}
            loading={audit.isPending}
            getRowId={(a) => a.id}
            columns={auditColumns}
            defaultSort={{ id: 'when', desc: true }}
            pageSize={3}
          />
        </Demo>
      </div>
    </ShowcaseSection>
  );
}

const memberColumns: DataTableColumn<MemberView>[] = [
  {
    id: 'name',
    header: t('ui.showcase.demo.memberColumns.name'),
    label: t('ui.showcase.demo.memberColumns.name'),
    sortValue: (m) => m.profile?.full_name ?? m.invite?.full_name ?? '—',
    cell: (m) => <UserChip name={m.profile?.full_name ?? m.invite?.full_name ?? '—'} seed={m.user_id} size="sm" />,
  },
  {
    id: 'role',
    header: t('ui.showcase.demo.memberColumns.role'),
    label: t('ui.showcase.demo.memberColumns.role'),
    sortValue: (m) => m.role,
    cell: (m) =>
      m.deleted_at ? (
        <ToneBadge tone="muted" size="sm" label={t('ui.badge.deleted')} />
      ) : (
        <RoleBadge role={m.role} size="sm" />
      ),
  },
  {
    id: 'since',
    header: t('ui.showcase.demo.memberColumns.since'),
    label: t('ui.showcase.demo.memberColumns.since'),
    hideBelow: 'sm',
    align: 'end',
    sortValue: (m) => m.created_at,
    cell: (m) => <span className="text-muted-foreground tabular-nums">{formatDate(m.created_at, TZ)}</span>,
  },
];

const auditColumns: DataTableColumn<AuditView>[] = [
  {
    id: 'when',
    header: t('ui.showcase.demo.auditColumns.when'),
    label: t('ui.showcase.demo.auditColumns.when'),
    sortValue: (a) => a.created_at,
    cell: (a) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(a.created_at, TZ)}</span>,
  },
  {
    id: 'who',
    header: t('ui.showcase.demo.auditColumns.who'),
    hideBelow: 'md',
    cell: (a) => a.actor?.full_name ?? t('ui.history.system'),
  },
  {
    id: 'action',
    header: t('ui.showcase.demo.auditColumns.action'),
    cell: (a) => (
      <span>
        {t(`ui.showcase.demo.auditActions.${a.action as 'member_invited'}`)}{' '}
        <span className="font-medium">{a.target_name}</span>
      </span>
    ),
  },
];

/** Painel lateral com o resumo da O.S. clicada na tabela. */
function OrderPanel({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const order = useQuery({
    queryKey: ['mock', 'order', orderId],
    queryFn: () => getOrder(orderId ?? ''),
    enabled: orderId !== null,
  });
  const o = order.data;
  return (
    <SidePanel
      open={orderId !== null}
      onOpenChange={(open) => !open && onClose()}
      title={
        o ? t('ui.showcase.demo.orderPanel', { number: formatOrderNumber(o.order_number) }) : t('ui.states.loading')
      }
      description={o?.title}
      size="md"
    >
      {!o ? (
        <LoadingList variant="row" count={4} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-1.5">
            <OrderStatusBadge status={o.status} />
            <PriorityBadge priority={o.priority} />
            <ServiceTypeBadge type={o.service_type} />
          </div>
          <DetailList columns={1}>
            <DetailItem label={t('ui.order.columns.client')}>
              {o.client.name} {o.client.phone && `· ${formatPhone(o.client.phone)}`}
            </DetailItem>
            {o.instructions && <DetailItem label={t('ui.showcase.demo.sectionTitle')}>{o.instructions}</DetailItem>}
          </DetailList>
          {o.address && <AddressBlock address={o.address} />}
          <Timeline
            entries={orderHistoryEntries(o.history, {
              timeZone: TZ,
              personName: (id) => getPerson(id)?.full_name ?? '—',
            })}
            timeZone={TZ}
            reverse
            density="compact"
          />
        </div>
      )}
    </SidePanel>
  );
}

export function PickersSection() {
  const [client, setClient] = React.useState<string | null>(null);
  const [techs, setTechs] = React.useState<string[]>([]);
  const [due, setDue] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<DateRange | null>(null);
  const clients = useQuery({ queryKey: ['mock', 'clients'], queryFn: () => listClients() });
  const technicians = useQuery({ queryKey: ['mock', 'technicians'], queryFn: () => listTechnicians() });
  return (
    <ShowcaseSection id="filters" title={t('ui.showcase.sections.filters')}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="demo-client">{t('ui.showcase.demo.clientPicker')}</FieldLabel>
          <SearchCombobox
            id="demo-client"
            value={client}
            onValueChange={setClient}
            loading={clients.isPending}
            options={(clients.data ?? []).map((c) => ({
              value: c.id,
              label: c.name,
              description: [c.phone && formatPhone(c.phone), c.primary_address?.district].filter(Boolean).join(' · '),
            }))}
            onCreate={(text) => scratchToast(t('ui.actions.create', { text }))}
          />
          <code className="text-xs text-muted-foreground">SearchCombobox · onCreate</code>
        </Field>
        <Field>
          <FieldLabel htmlFor="demo-techs">{t('ui.showcase.demo.techPicker')}</FieldLabel>
          <SearchCombobox
            id="demo-techs"
            multiple
            avatars
            value={techs}
            onValueChange={setTechs}
            options={(technicians.data ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
          />
          <code className="text-xs text-muted-foreground">SearchCombobox multiple avatars</code>
        </Field>
        <Field>
          <FieldLabel htmlFor="demo-due">{t('ui.showcase.demo.duePicker')}</FieldLabel>
          <DatePicker id="demo-due" value={due} onValueChange={setDue} timeZone={TZ} disablePast />
          <code className="text-xs text-muted-foreground">DatePicker disablePast</code>
        </Field>
        <Field>
          <FieldLabel>{t('ui.showcase.demo.periodPicker')}</FieldLabel>
          <PeriodPicker
            value={period}
            onValueChange={setPeriod}
            timeZone={TZ}
            presets={['last7', 'last30', 'thisMonth', 'lastMonth']}
            className="w-full"
          />
          <code className="text-xs text-muted-foreground">PeriodPicker presets</code>
        </Field>
      </div>
    </ShowcaseSection>
  );
}

export function StatsSection() {
  const counts = useQuery({ queryKey: ['mock', 'dashboard'], queryFn: () => getDashboard() });
  const c = counts.data;
  return (
    <ShowcaseSection id="stats" title={t('ui.showcase.sections.stats')}>
      <Demo label="StatGrid · DASHBOARD_STATS · StatCard">
        <StatGrid>
          {DASHBOARD_STATS.map((stat) => {
            const value = c ? c[stat.key] : null;
            return (
              <StatCard
                key={stat.key}
                label={stat.label}
                value={value}
                icon={stat.icon}
                toneClass={stat.toneClass}
                hint={stat.hint}
                highlight={stat.alertWhenPositive && (value ?? 0) > 0}
                onClick={() => scratchToast(stat.label)}
              />
            );
          })}
        </StatGrid>
      </Demo>
      <Demo label='StatCard size="sm" · value={null}'>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            size="sm"
            label={t('ui.stats.inProgressTotal')}
            value={c ? c.open + c.in_progress + c.pending_approval + c.rejected : null}
            tone="brand"
          />
          <StatCard size="sm" label={t('ui.showcase.demo.loadingState')} value={null} />
        </div>
      </Demo>
    </ShowcaseSection>
  );
}
