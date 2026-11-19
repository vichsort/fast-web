// Vitrine: tema, selos, estrutura da página, estados, usuários e formatação.
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Download, FileText, Plus } from 'lucide-react';
import * as React from 'react';
import {
  AlertBadge,
  CountBadge,
  LateSupplementBadge,
  NewBadge,
  OrderStatusBadge,
  OverdueBadge,
  PhotoSourceBadge,
  PriorityBadge,
  ReviewStatusBadge,
  RoleBadge,
  ServiceTypeBadge,
  type ToneBadgeVariant,
  UnassignedBadge,
} from '@/components/badges';
import { PageHeader } from '@/components/page-header';
import { DetailItem, DetailList, Section } from '@/components/section';
import {
  EmptyState,
  ErrorState,
  LoadingDetail,
  LoadingInline,
  LoadingList,
  ScratchBanner,
  scratchToast,
} from '@/components/states';
import { type Tone, toneVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { AvatarStack, UserAvatar, UserChip } from '@/components/user';
import {
  MEMBER_ROLES,
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  PHOTO_SOURCES,
  REVIEW_STATUSES,
  SERVICE_TYPES,
} from '@/lib/enums';
import {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDue,
  formatFileSize,
  formatOrderNumber,
  formatPhone,
  formatRelative,
  formatTime,
  formatZipCode,
  initials,
  shortAddress,
} from '@/lib/format';
import { t } from '@/lib/i18n';
import { getOrder, listMembers } from '@/mocks';
import { Demo, Row, ShowcaseSection, TZ } from './frame';

const tones: Tone[] = ['neutral', 'muted', 'brand', 'info', 'progress', 'warning', 'danger', 'success'];

const semanticTokens = [
  '--status-open',
  '--status-in-progress',
  '--status-pending-approval',
  '--status-rejected',
  '--status-approved',
  '--status-cancelled',
  '--priority-high',
  '--priority-urgent',
  '--alert-gallery-without-exif',
  '--alert-gallery-before-start',
  '--overdue',
  '--late-supplement',
  '--unassigned',
  '--new-item',
  '--whatsapp',
];

export function TokensSection() {
  return (
    <ShowcaseSection id="tokens" title={t('ui.showcase.sections.tokens')} description={t('ui.showcase.demo.tokenNote')}>
      <Demo label={t('ui.showcase.demo.tones')}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tones.map((tone) => (
            <div key={tone} className={`flex flex-col overflow-hidden rounded-lg border ${toneVar[tone]}`}>
              <div className="tone-fill h-10" />
              <div className="tone-soft flex flex-col gap-0.5 border-0 px-2 py-1.5">
                <code className="text-xs font-semibold">--tone-{tone}</code>
                <span className="text-[0.6875rem] opacity-80">tone-soft</span>
              </div>
            </div>
          ))}
        </div>
      </Demo>
      <Demo label={t('ui.showcase.demo.roles')}>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {semanticTokens.map((token) => (
            <div key={token} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
              <span className="size-4 shrink-0 rounded-full border" style={{ background: `var(${token})` }} />
              <code className="truncate text-xs">{token}</code>
            </div>
          ))}
        </div>
      </Demo>
      <Demo label="--primary · --radius · --sidebar">
        <Row>
          <Button>{t('ui.showcase.demo.newOrder')}</Button>
          <Button variant="outline">{t('ui.showcase.demo.export')}</Button>
          <Button variant="secondary">{t('ui.actions.cancel')}</Button>
          <Button variant="destructive">{t('ui.dialogs.rejectConfirm')}</Button>
          <span className="flex h-8 items-center rounded-lg bg-sidebar px-3 text-xs text-sidebar-foreground">
            --sidebar
          </span>
        </Row>
      </Demo>
    </ShowcaseSection>
  );
}

const variants: ToneBadgeVariant[] = ['soft', 'solid', 'outline', 'dot', 'text'];

export function BadgesSection() {
  return (
    <ShowcaseSection id="badges" title={t('ui.showcase.sections.badges')}>
      <Demo label="OrderStatusBadge · variant">
        <div className="flex flex-col gap-2">
          {variants.map((variant) => (
            <Row key={variant}>
              <code className="w-14 text-xs text-muted-foreground">{variant}</code>
              {ORDER_STATUSES.map((s) => (
                <OrderStatusBadge key={s} status={s} variant={variant} />
              ))}
            </Row>
          ))}
        </div>
      </Demo>
      <div className="grid gap-4 md:grid-cols-2">
        <Demo label="PriorityBadge">
          <Row>
            {ORDER_PRIORITIES.map((p) => (
              <PriorityBadge key={p} priority={p} />
            ))}
            <PriorityBadge priority="high" long />
          </Row>
        </Demo>
        <Demo label="ServiceTypeBadge">
          <Row>
            {SERVICE_TYPES.map((s) => (
              <ServiceTypeBadge key={s} type={s} />
            ))}
          </Row>
        </Demo>
        <Demo label="RoleBadge">
          <Row>
            {MEMBER_ROLES.map((r) => (
              <RoleBadge key={r} role={r} />
            ))}
          </Row>
        </Demo>
        <Demo label="ReviewStatusBadge">
          <Row>
            {REVIEW_STATUSES.map((r) => (
              <ReviewStatusBadge key={r} status={r} />
            ))}
          </Row>
        </Demo>
        <Demo label="PhotoSourceBadge · AlertBadge">
          <Row>
            {PHOTO_SOURCES.map((s) => (
              <PhotoSourceBadge key={s} source={s} />
            ))}
            <AlertBadge code="gallery_without_exif" />
            <AlertBadge code="gallery_before_start" />
            <AlertBadge code="submitted_before_rejection" />
            <AlertBadge code="late_delivery" />
          </Row>
        </Demo>
        <Demo label="OverdueBadge · UnassignedBadge · LateSupplementBadge · NewBadge · CountBadge">
          <Row>
            <OverdueBadge />
            <UnassignedBadge />
            <LateSupplementBadge count={2} />
            <NewBadge />
            <CountBadge count={3} />
            <CountBadge count={120} tone="brand" />
          </Row>
        </Demo>
      </div>
      <Demo label={`${t('ui.showcase.sizes')}: sm · md · lg · iconOnly`}>
        <Row>
          <OrderStatusBadge status="pending_approval" size="sm" />
          <OrderStatusBadge status="pending_approval" size="md" />
          <OrderStatusBadge status="pending_approval" size="lg" />
          <OrderStatusBadge status="pending_approval" iconOnly />
          <PriorityBadge priority="urgent" iconOnly size="lg" />
        </Row>
      </Demo>
    </ShowcaseSection>
  );
}

export function LayoutSection() {
  const { data: order } = useQuery({ queryKey: ['mock', 'order', '38'], queryFn: () => getOrder('38') });
  if (!order) return <LoadingDetail />;
  return (
    <ShowcaseSection id="layout" title={t('ui.showcase.sections.layout')}>
      <Demo label='PageHeader size="lg"'>
        <div className="rounded-xl border bg-background p-4">
          <PageHeader
            size="lg"
            back={() => scratchToast(t('ui.actions.back'))}
            eyebrow={formatOrderNumber(order.order_number)}
            title={order.title}
            description={order.client.name}
            meta={
              <>
                <OrderStatusBadge status={order.status} />
                <PriorityBadge priority={order.priority} />
                <ServiceTypeBadge type={order.service_type} />
              </>
            }
            actions={
              <>
                <Button variant="outline" onClick={() => scratchToast(t('ui.showcase.demo.export'))}>
                  <Download />
                  {t('ui.showcase.demo.export')}
                </Button>
                <Button onClick={() => scratchToast(t('ui.showcase.demo.newOrder'))}>
                  <Plus />
                  {t('ui.showcase.demo.newOrder')}
                </Button>
              </>
            }
          />
        </div>
      </Demo>
      <Demo label='PageHeader size="sm"'>
        <div className="rounded-xl border bg-background p-4">
          <PageHeader
            size="sm"
            title={t('ui.showcase.demo.pageTitle')}
            description={t('ui.showcase.demo.pageDescription')}
          />
        </div>
      </Demo>
      <div className="grid gap-4 lg:grid-cols-3">
        <Demo label='Section variant="card"'>
          <Section
            title={t('ui.showcase.demo.sectionTitle')}
            description={t('ui.showcase.demo.sectionDescription')}
            icon={FileText}
            actions={
              <Button variant="ghost" size="sm">
                {t('ui.actions.seeAll')}
              </Button>
            }
          >
            <DetailList columns={1}>
              <DetailItem label={t('ui.order.columns.client')}>{order.client.name}</DetailItem>
              <DetailItem label={t('ui.order.columns.due')}>
                {order.due_at ? formatDateShort(order.due_at, TZ) : t('ui.badge.noDueDate')}
              </DetailItem>
            </DetailList>
          </Section>
        </Demo>
        <Demo label='Section variant="muted"'>
          <Section variant="muted" title={t('ui.showcase.demo.sectionTitle')} icon={ClipboardList}>
            <p>{order.instructions}</p>
          </Section>
        </Demo>
        <Demo label='Section variant="plain" + DetailList columns={2}'>
          <Section variant="plain" title={t('ui.showcase.demo.sectionTitle')}>
            <DetailList>
              <DetailItem label={t('ui.order.columns.status')}>
                <OrderStatusBadge status={order.status} size="sm" />
              </DetailItem>
              <DetailItem label={t('ui.order.columns.priority')}>
                <PriorityBadge priority={order.priority} size="sm" />
              </DetailItem>
              <DetailItem label={t('ui.showcase.demo.fieldNotes')} full>
                {order.materials_notes}
              </DetailItem>
            </DetailList>
          </Section>
        </Demo>
      </div>
    </ShowcaseSection>
  );
}

export function StatesSection() {
  const [retrying, setRetrying] = React.useState(false);
  function retry() {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 1200);
  }
  return (
    <ShowcaseSection id="states" title={t('ui.showcase.sections.states')}>
      <ScratchBanner />
      <div className="grid gap-4 md:grid-cols-2">
        <Demo label="EmptyState">
          <EmptyState
            bordered
            action={
              <Button onClick={() => scratchToast(t('ui.showcase.demo.emptyAction'))}>
                <Plus />
                {t('ui.showcase.demo.emptyAction')}
              </Button>
            }
          />
        </Demo>
        <Demo label='EmptyState kind="filtered"'>
          <EmptyState
            bordered
            kind="filtered"
            action={<Button variant="outline">{t('ui.actions.clearFilters')}</Button>}
          />
        </Demo>
        <Demo label='ErrorState code="not_found"'>
          <ErrorState code="not_found" onRetry={retry} retrying={retrying} className="rounded-xl border" />
        </Demo>
        <Demo label="ErrorState offline">
          <ErrorState offline onRetry={retry} retrying={retrying} className="rounded-xl border" />
        </Demo>
      </div>
      <Demo label='ErrorState layout="inline"'>
        <ErrorState layout="inline" message={t('ui.showcase.demo.errorMessage')} onRetry={retry} retrying={retrying} />
      </Demo>
      <div className="grid gap-4 md:grid-cols-3">
        <Demo label='LoadingList variant="card"'>
          <LoadingList count={2} />
        </Demo>
        <Demo label='LoadingList variant="row" · LoadingInline'>
          <LoadingList variant="row" count={3} />
          <LoadingInline />
        </Demo>
        <Demo label="LoadingDetail">
          <LoadingDetail />
        </Demo>
      </div>
      <Demo label='LoadingList variant="table"'>
        <LoadingList variant="table" count={3} columns={5} />
      </Demo>
    </ShowcaseSection>
  );
}

export function UsersSection() {
  const members = useQuery({ queryKey: ['mock', 'members'], queryFn: () => listMembers() });
  const people = (members.data ?? []).map((m) => ({ id: m.user_id, full_name: m.profile.full_name }));
  return (
    <ShowcaseSection id="users" title={t('ui.showcase.sections.users')}>
      <Demo label="UserAvatar · size">
        <Row>
          {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
            <UserAvatar key={size} name={people[2]?.full_name ?? '—'} seed={people[2]?.id} size={size} />
          ))}
          {people.map((p) => (
            <UserAvatar key={p.id} name={p.full_name} seed={p.id} />
          ))}
        </Row>
      </Demo>
      <div className="grid gap-4 md:grid-cols-3">
        {members.data?.slice(0, 3).map((m, i) => (
          <Demo key={m.id} label={`UserChip size="${(['sm', 'md', 'lg'] as const)[i]}"`}>
            <UserChip
              name={m.profile.full_name}
              seed={m.user_id}
              memberRole={m.role}
              isSelf={i === 1}
              size={(['sm', 'md', 'lg'] as const)[i]}
            />
          </Demo>
        ))}
      </div>
      <Demo label="AvatarStack · showNames · max">
        <Row className="gap-6">
          <AvatarStack people={people.slice(2, 4)} showNames />
          <AvatarStack people={people} max={3} size="md" />
          <AvatarStack people={[]} empty={<UnassignedBadge size="sm" />} />
        </Row>
      </Demo>
    </ShowcaseSection>
  );
}

export function FormatSection() {
  const order = useQuery({ queryKey: ['mock', 'order', '38'], queryFn: () => getOrder('38') });
  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 86_400_000);
  const before = new Date(now.getTime() - 3 * 3_600_000);
  const rows: [string, string][] = [
    ['formatOrderNumber(42)', formatOrderNumber(42)],
    ["formatPhone('11987650003')", formatPhone('11987650003')],
    ["formatPhone('+55 11 3322-4455')", formatPhone('+55 11 3322-4455')],
    ["formatZipCode('01310100')", formatZipCode('01310100')],
    ['formatDate(now, tz)', formatDate(now, TZ)],
    ['formatTime(now, tz)', formatTime(now, TZ)],
    ['formatDateTime(now, tz)', formatDateTime(now, TZ)],
    ['formatDateShort(now, tz)', formatDateShort(now, TZ)],
    ['formatRelative(-3 h)', formatRelative(before, TZ, now)],
    ['formatDue(+2 dias)', formatDue(soon, TZ, now)],
    ['shortAddress(order.address)', shortAddress(order.data?.address)],
    ["initials('Ana Paula Souza')", initials('Ana Paula Souza')],
    ['formatFileSize(412000)', formatFileSize(412_000)],
  ];
  return (
    <ShowcaseSection id="format" title={t('ui.showcase.sections.format')} description="src/lib/format.ts">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('ui.showcase.demo.sampleLabel')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('ui.showcase.demo.sampleResult')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([code, result]) => (
              <tr key={code} className="border-t">
                <td className="px-3 py-2">
                  <code className="text-xs">{code}</code>
                </td>
                <td className="px-3 py-2 tabular-nums">{result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ShowcaseSection>
  );
}
