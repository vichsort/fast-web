// Auditoria (owner, 05): quem mudou a empresa, os membros e os papéis. Lista filtrável, mais nova primeiro.
import * as React from 'react';
import { RoleBadge } from '@/components/badges';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { FilterBar, FilterSelect, SearchInput } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { type DateRange, PeriodPicker } from '@/components/period-picker';
import { EmptyState, ErrorState } from '@/components/states';
import { UserAvatar } from '@/components/user';
import type { MemberRole } from '@/lib/enums';
import { calendarDay, formatDateTime, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { AuditView } from '@/lib/views';
import { useAudit } from '../queries';
import { useOffice } from '../session';
import { OwnerOnly } from '../shared';

const ACTIONS = [
  'company_updated',
  'member_invited',
  'member_accepted',
  'member_role_changed',
  'member_removed',
  'password_link_created',
] as const;
type AuditAction = (typeof ACTIONS)[number];
const FIELDS = ['name', 'document', 'phone', 'email', 'timezone', 'deleted_at'] as const;

const actionLabel = (action: string) =>
  ACTIONS.includes(action as AuditAction) ? t(`office.audit.actions.${action as AuditAction}`) : action;

export function AuditPage() {
  return (
    <OwnerOnly>
      <AuditList />
    </OwnerOnly>
  );
}

function AuditList() {
  const { timeZone } = useOffice();
  const audit = useAudit();
  const [search, setSearch] = React.useState('');
  const [action, setAction] = React.useState<AuditAction | null>(null);
  const [actor, setActor] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<DateRange | null>(null);

  const actors = [...new Map((audit.data ?? []).flatMap((a) => (a.actor ? [[a.actor.id, a.actor]] : []))).values()];
  const q = search.trim().toLowerCase();
  const rows = (audit.data ?? []).filter((a) => {
    if (q && !`${a.actor?.full_name ?? ''} ${a.target_name}`.toLowerCase().includes(q)) return false;
    if (action && a.action !== action) return false;
    if (actor && a.actor_id !== actor) return false;
    if (period) {
      const day = calendarDay(a.created_at, timeZone);
      if (day < period.from || day > period.to) return false;
    }
    return true;
  });
  const activeCount = [action, actor, period].filter(Boolean).length;

  const columns: DataTableColumn<AuditView>[] = [
    {
      id: 'when',
      header: t('office.audit.columns.when'),
      label: t('office.audit.columns.when'),
      className: 'w-40',
      sortValue: (a) => a.created_at,
      cell: (a) => (
        <span className="flex flex-col">
          <span className="whitespace-nowrap tabular-nums">{formatDateTime(a.created_at, timeZone)}</span>
          <span className="text-xs text-muted-foreground">{formatRelative(a.created_at, timeZone)}</span>
        </span>
      ),
    },
    {
      id: 'who',
      header: t('office.audit.columns.who'),
      hideBelow: 'md',
      cell: (a) =>
        a.actor ? (
          <span className="flex items-center gap-2">
            <UserAvatar name={a.actor.full_name} seed={a.actor.id} size="xs" decorative />
            {a.actor.full_name}
          </span>
        ) : (
          t('ui.history.system')
        ),
    },
    {
      id: 'action',
      header: t('office.audit.columns.action'),
      cell: (a) => (
        <span>
          {actionLabel(a.action)}
          {a.action !== 'company_updated' && <span className="font-medium"> {a.target_name}</span>}
        </span>
      ),
    },
    {
      id: 'details',
      header: t('office.audit.columns.details'),
      hideBelow: 'sm',
      cell: (a) => <AuditDetails entry={a} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader size="lg" title={t('office.audit.title')} description={t('office.audit.description')} />
      <FilterBar
        search={
          <SearchInput value={search} onValueChange={setSearch} placeholder={t('office.audit.searchPlaceholder')} />
        }
        filters={
          <>
            <FilterSelect
              label={t('office.audit.action')}
              value={action}
              options={ACTIONS.map((value) => ({ value, label: actionLabel(value) }))}
              onValueChange={setAction}
            />
            <FilterSelect
              label={t('office.audit.actor')}
              value={actor}
              options={actors.map((p) => ({ value: p.id, label: p.full_name }))}
              onValueChange={setActor}
            />
            <PeriodPicker
              label={t('office.audit.period')}
              value={period}
              onValueChange={setPeriod}
              timeZone={timeZone}
              presets={['today', 'last7', 'last30', 'thisMonth', 'lastMonth']}
            />
          </>
        }
        activeCount={activeCount}
        onClear={() => {
          setAction(null);
          setActor(null);
          setPeriod(null);
        }}
      />
      {audit.isError ? (
        <ErrorState onRetry={() => void audit.refetch()} />
      ) : (
        <DataTable<AuditView>
          rows={rows}
          columns={columns}
          getRowId={(a) => a.id}
          loading={audit.isPending}
          defaultSort={{ id: 'when', desc: true }}
          pageSize={20}
          caption={t('office.audit.title')}
          empty={<EmptyState size="sm" kind="filtered" />}
        />
      )}
    </div>
  );
}

/** Resumo do metadata de cada ação (05: tabela de `action`). */
function AuditDetails({ entry }: { entry: AuditView }) {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const closed = Number(meta.closed_assignments ?? 0);
  const parts: React.ReactNode[] = [];
  if (entry.action === 'member_invited') {
    parts.push(<RoleBadge key="role" role={meta.role as MemberRole} size="sm" />);
    if (meta.reactivated) parts.push(<span key="re">{t('office.audit.details.reactivated')}</span>);
  }
  if (entry.action === 'member_role_changed') {
    parts.push(
      <span key="change" className="inline-flex items-center gap-1">
        <RoleBadge role={meta.from as MemberRole} size="sm" />→<RoleBadge role={meta.to as MemberRole} size="sm" />
      </span>,
    );
  }
  if (entry.action === 'member_removed' && typeof meta.reason === 'string') {
    parts.push(<span key="reason">{t('office.common.reason', { reason: meta.reason })}</span>);
  }
  if (entry.action === 'company_updated') {
    const changes = Object.keys((meta.changes ?? {}) as Record<string, unknown>);
    const labels = changes.map((f) =>
      FIELDS.includes(f as (typeof FIELDS)[number]) ? t(`office.audit.fields.${f as (typeof FIELDS)[number]}`) : f,
    );
    parts.push(<span key="fields">{t('office.audit.details.fields', { fields: labels.join(', ') })}</span>);
  }
  if (closed > 0) parts.push(<span key="closed">{t('office.audit.details.closed', { count: closed })}</span>);
  return <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{parts}</span>;
}
