// Importação de clientes por CSV (02, import_clients): só o esboço da prévia, marcado como "depois do primeiro
// deploy". O formato de p_rows e da saída sai do CSV real da Fast (roadmap do backend, etapa 9).
import { Link } from '@tanstack/react-router';
import { CircleCheck, CircleX, Copy, FileSpreadsheet, FileUp, Info, RotateCw } from 'lucide-react';
import * as React from 'react';
import { ToneBadge } from '@/components/badges';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { scratchToast } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatNumber, formatPhone } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Notice } from '../shared';

type RowResult = { kind: 'ok' } | { kind: 'error'; message: string } | { kind: 'duplicate'; message: string };

interface PreviewRow {
  line: number;
  name: string;
  phone: string;
  address: string;
  result: RowResult;
}

/** Prévia de exemplo: o que o import_clients com p_dry_run devolveria, linha a linha. */
const SAMPLE: PreviewRow[] = [
  {
    line: 2,
    name: 'Farmácia Vida Plena',
    phone: '1133447788',
    address: 'Rua Domingos de Morais, 2100 - São Paulo/SP',
    result: { kind: 'ok' },
  },
  {
    line: 3,
    name: 'Oficina Mecânica do Zé',
    phone: '11987001122',
    address: 'Av. Jabaquara, 850 - São Paulo/SP',
    result: { kind: 'ok' },
  },
  {
    line: 4,
    name: '',
    phone: '11955554444',
    address: 'Rua Vergueiro, 3000 - São Paulo/SP',
    result: { kind: 'error', message: t('office.import.rows.emptyName') },
  },
  {
    line: 5,
    name: 'Padaria Pão Dourado',
    phone: '1132104455',
    address: 'Rua das Acácias, 120 - São Paulo/SP',
    result: { kind: 'duplicate', message: t('office.import.rows.duplicateExisting', { name: 'Padaria Pão Dourado' }) },
  },
  {
    line: 6,
    name: 'Pet Shop Amigo Fiel',
    phone: '1128889900',
    address: 'Rua Cubatão, 45 - São Paulo/XX',
    result: { kind: 'error', message: t('office.import.rows.invalidState', { value: 'XX' }) },
  },
  {
    line: 7,
    name: 'Igreja Batista Central',
    phone: '1137776655',
    address: 'Rua Tutóia, 300 - São Paulo/SP',
    result: { kind: 'ok' },
  },
  {
    line: 8,
    name: 'Oficina Mecânica do Zé',
    phone: '11987001122',
    address: 'Av. Jabaquara, 850 - São Paulo/SP',
    result: { kind: 'duplicate', message: t('office.import.rows.duplicateInFile', { line: 3 }) },
  },
  {
    line: 9,
    name: 'Loja de Tintas Arco-Íris',
    phone: '1145671234',
    address: 'Rua Sena Madureira, 77 - SP',
    result: { kind: 'error', message: t('office.import.rows.missingCity') },
  },
  {
    line: 10,
    name: 'Restaurante Sabor Caseiro',
    phone: '1139990011',
    address: 'Rua Loefgren, 1500 - São Paulo/SP',
    result: { kind: 'ok' },
  },
];

export function ClientImportPage() {
  const [loaded, setLoaded] = React.useState(false);
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);
  const counts = {
    ok: SAMPLE.filter((r) => r.result.kind === 'ok').length,
    error: SAMPLE.filter((r) => r.result.kind === 'error').length,
    duplicate: SAMPLE.filter((r) => r.result.kind === 'duplicate').length,
  };
  const toImport = counts.ok + (skipDuplicates ? 0 : counts.duplicate);

  const columns: DataTableColumn<PreviewRow>[] = [
    {
      id: 'line',
      header: t('office.import.columns.line'),
      className: 'w-16',
      cell: (r) => <span className="tabular-nums text-muted-foreground">{r.line}</span>,
    },
    {
      id: 'name',
      header: t('office.import.columns.name'),
      cell: (r) =>
        r.name ? <span className="font-medium">{r.name}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'phone',
      header: t('office.import.columns.phone'),
      hideBelow: 'md',
      cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatPhone(r.phone)}</span>,
    },
    {
      id: 'address',
      header: t('office.import.columns.address'),
      hideBelow: 'lg',
      cell: (r) => <span className="text-sm text-muted-foreground">{r.address}</span>,
    },
    {
      id: 'result',
      header: t('office.import.columns.result'),
      cell: (r) => <ResultCell result={r.result} skipDuplicates={skipDuplicates} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        size="lg"
        back={<Link to="/office/clients" />}
        title={t('office.import.title')}
        description={t('office.import.description')}
        meta={<ToneBadge tone="progress" variant="outline" label={t('office.import.later')} />}
      />
      <Notice
        tone="progress"
        icon={Info}
        title={t('office.import.sketchTitle')}
        description={t('office.import.sketchDescription')}
      />

      {!loaded ? (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-card px-6 py-12 text-center outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileUp className="size-6" />
          </span>
          <span className="font-medium">{t('office.import.pick')}</span>
          <span className="max-w-md text-sm text-muted-foreground">{t('office.import.pickHint')}</span>
        </button>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <FileSpreadsheet aria-hidden className="size-4 text-muted-foreground" />
              {t('office.import.loaded', { file: 'clientes-fast.csv', count: SAMPLE.length })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setLoaded(false)}>
              <RotateCw />
              {t('office.import.change')}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary
              icon={CircleCheck}
              tone="[--tone:var(--tone-success)]"
              label={t('office.import.valid')}
              value={counts.ok}
            />
            <Summary
              icon={CircleX}
              tone="[--tone:var(--tone-danger)]"
              label={t('office.import.errors')}
              value={counts.error}
            />
            <Summary
              icon={Copy}
              tone="[--tone:var(--tone-warning)]"
              label={t('office.import.duplicates')}
              value={counts.duplicate}
            />
          </div>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: o Switch do Base UI é o controle dentro do label */}
          <label className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
            <Switch checked={skipDuplicates} onCheckedChange={setSkipDuplicates} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{t('office.import.skipDuplicates')}</span>
              <span className="text-xs text-muted-foreground">{t('office.import.skipDuplicatesHint')}</span>
            </span>
          </label>
          <DataTable<PreviewRow>
            rows={SAMPLE}
            columns={columns}
            getRowId={(r) => String(r.line)}
            pageSize={0}
            density="compact"
            rowClassName={(r) => (r.result.kind === 'error' ? 'bg-destructive/5' : undefined)}
          />
          <div className="flex flex-wrap items-center justify-end gap-3">
            {counts.error > 0 && <p className="text-sm text-muted-foreground">{t('office.import.allOrNothing')}</p>}
            <Button disabled={counts.error > 0} onClick={() => scratchToast(t('office.import.actionLabel'))}>
              {t('office.import.action', { count: formatNumber(toImport) })}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof CircleCheck;
  tone: string;
  label: string;
  value: number;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border bg-card p-4', tone)}>
      <span className="tone-soft flex size-9 items-center justify-center rounded-lg border">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="flex flex-col">
        <span className="font-heading text-2xl font-semibold leading-none tabular-nums">{formatNumber(value)}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function ResultCell({ result, skipDuplicates }: { result: RowResult; skipDuplicates: boolean }) {
  if (result.kind === 'ok')
    return <ToneBadge tone="success" size="sm" icon={CircleCheck} label={t('office.import.ok')} />;
  return (
    <div className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-1.5">
        {result.kind === 'error' ? (
          <ToneBadge tone="danger" size="sm" icon={CircleX} label={t('office.import.error')} />
        ) : (
          <>
            <ToneBadge tone="warning" size="sm" icon={Copy} label={t('office.import.duplicate')} />
            <span className="text-xs text-muted-foreground">
              {t(skipDuplicates ? 'office.import.skipped' : 'office.import.imported')}
            </span>
          </>
        )}
      </span>
      <span className="text-xs">{result.message}</span>
    </div>
  );
}
