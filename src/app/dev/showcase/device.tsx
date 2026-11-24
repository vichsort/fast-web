// Vitrine: sincronização e fila, diálogos e painéis, navegação.
import { useQuery } from '@tanstack/react-query';
import { Building, ClipboardList, Inbox, LayoutDashboard, ListTodo, ScrollText, UserRound, Users } from 'lucide-react';
import * as React from 'react';
import { TechnicianShell } from '@/components/app-shell';
import { ConfirmDialog, FormDialog, FormPanel, ReasonDialog, SidePanel } from '@/components/dialogs';
import { type NavItem, OfficeSidebar, OfficeTopbar, TechnicianBottomNav } from '@/components/nav';
import { OrderCard } from '@/components/order-card';
import { DatePicker } from '@/components/period-picker';
import { SearchCombobox } from '@/components/search-combobox';
import { LoadingList, scratchToast } from '@/components/states';
import { PendingItemCard, SyncIndicator, type SyncStatus } from '@/components/sync';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserChip } from '@/components/user';
import { formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import {
  getDashboard,
  getOrder,
  getPerson,
  getSyncState,
  listMyOrders,
  listPendingItems,
  listTechnicians,
  MOCK_USER_IDS,
} from '@/mocks';
import { Demo, Row, ShowcaseSection, TZ } from './frame';

export function SyncSection() {
  const sync = useQuery({ queryKey: ['mock', 'sync'], queryFn: () => getSyncState() });
  const items = useQuery({ queryKey: ['mock', 'pending'], queryFn: () => listPendingItems() });
  const base = sync.data;
  const variants: [string, SyncStatus][] = base
    ? [
        ['ok', { ...base, syncing: false, pending: 0, blocked: 0 }],
        ['syncing', base],
        ['pending', { ...base, syncing: false, blocked: 0 }],
        ['offline', { ...base, online: false, syncing: false }],
        ['blocked', { ...base, syncing: false, pending: 0 }],
        ['needs_login', { ...base, needs_login: true }],
      ]
    : [];
  return (
    <ShowcaseSection id="sync" title={t('ui.showcase.sections.sync')}>
      <Demo label='SyncIndicator variant="pill"'>
        <Row>
          {variants.map(([key, status]) => (
            <SyncIndicator key={key} status={status} timeZone={TZ} />
          ))}
        </Row>
      </Demo>
      <Demo label='SyncIndicator variant="banner" onClick'>
        <div className="flex max-w-lg flex-col gap-2">
          {variants.slice(1, 4).map(([key, status]) => (
            <SyncIndicator
              key={key}
              status={status}
              timeZone={TZ}
              variant="banner"
              onClick={() => scratchToast(t('ui.nav.pending'))}
            />
          ))}
        </div>
      </Demo>
      <Demo label="PendingItemCard (sending · queued · waiting · refused · blocked)">
        {items.isPending ? (
          <LoadingList count={2} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.data?.map((item) => (
              <PendingItemCard
                key={item.id}
                item={item}
                timeZone={TZ}
                onRetry={
                  item.state === 'waiting' || item.state === 'blocked'
                    ? () => scratchToast(t('ui.actions.tryNow'))
                    : undefined
                }
                onDiscard={
                  item.state === 'refused' && item.kind !== 'materials'
                    ? () => scratchToast(t('ui.actions.discard'))
                    : undefined
                }
                onDismiss={
                  item.state === 'refused' && item.kind === 'materials'
                    ? () => scratchToast(t('ui.actions.dismiss'))
                    : undefined
                }
                onOpen={item.on_device ? () => scratchToast(t('ui.actions.open')) : undefined}
              />
            ))}
          </div>
        )}
      </Demo>
    </ShowcaseSection>
  );
}

export function DialogsSection() {
  const order = useQuery({ queryKey: ['mock', 'order', '38'], queryFn: () => getOrder('38') });
  const technicians = useQuery({ queryKey: ['mock', 'technicians'], queryFn: () => listTechnicians() });
  const [comment, setComment] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [due, setDue] = React.useState<string | null>(null);
  const [techs, setTechs] = React.useState<string[]>([]);
  const o = order.data;
  React.useEffect(() => {
    if (!o) return;
    setTitle(o.title);
    setTechs(o.assignees.map((a) => a.id));
  }, [o]);
  const techOptions = (technicians.data ?? []).map((p) => ({ value: p.id, label: p.full_name }));
  const number = o ? formatOrderNumber(o.order_number) : '';
  const wait = () => new Promise((resolve) => setTimeout(resolve, 600));

  const formFields = (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="demo-title">{t('ui.showcase.demo.fieldTitle')}</FieldLabel>
        <Input id="demo-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="demo-form-due">{t('ui.showcase.demo.fieldDue')}</FieldLabel>
        <DatePicker id="demo-form-due" value={due} onValueChange={setDue} timeZone={TZ} />
      </Field>
      <Field>
        <FieldLabel htmlFor="demo-form-techs">{t('ui.showcase.demo.fieldTechs')}</FieldLabel>
        <SearchCombobox
          id="demo-form-techs"
          multiple
          avatars
          value={techs}
          onValueChange={setTechs}
          options={techOptions}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="demo-notes">{t('ui.showcase.demo.fieldNotes')}</FieldLabel>
        <Textarea id="demo-notes" defaultValue={o?.materials_notes ?? ''} rows={4} />
      </Field>
    </FieldGroup>
  );

  return (
    <ShowcaseSection id="dialogs" title={t('ui.showcase.sections.dialogs')}>
      <Row>
        <ConfirmDialog
          trigger={<Button>{t('ui.showcase.demo.openConfirm')}</Button>}
          title={t('ui.dialogs.approveTitle')}
          description={t('ui.dialogs.approveDescription')}
          confirmLabel={t('ui.dialogs.approveConfirm')}
          onConfirm={() => wait().then(() => scratchToast(t('ui.dialogs.approveConfirm')))}
        >
          <Field>
            <FieldLabel htmlFor="demo-approve">{t('ui.showcase.demo.approveComment')}</FieldLabel>
            <Textarea id="demo-approve" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </Field>
        </ConfirmDialog>
        <ReasonDialog
          trigger={<Button variant="destructive">{t('ui.showcase.demo.openCancel')}</Button>}
          title={t('ui.dialogs.cancelOrderTitle', { number })}
          description={t('ui.dialogs.cancelOrderDescription')}
          confirmLabel={t('ui.dialogs.cancelOrderConfirm')}
          onConfirm={() => wait().then(() => scratchToast(t('ui.dialogs.cancelOrderConfirm')))}
        >
          {o && <OrderCard order={o} timeZone={TZ} density="compact" />}
        </ReasonDialog>
        <ReasonDialog
          trigger={<Button variant="outline">{t('ui.showcase.demo.openReject')}</Button>}
          title={t('ui.dialogs.rejectTitle')}
          description={t('ui.dialogs.rejectDescription')}
          label={t('ui.dialogs.rejectLabel')}
          requiredCode="comment_required"
          confirmLabel={t('ui.dialogs.rejectConfirm')}
          onConfirm={() => scratchToast(t('ui.dialogs.rejectConfirm'))}
        />
        <FormDialog
          trigger={<Button variant="outline">{t('ui.showcase.demo.openForm')}</Button>}
          title={t('ui.showcase.demo.formTitle')}
          description={t('ui.showcase.demo.formDescription')}
          onSubmit={() => wait().then(() => scratchToast(t('ui.actions.save')))}
          submitDisabled={!title.trim()}
        >
          {formFields}
        </FormDialog>
        <SidePanel
          trigger={<Button variant="outline">{t('ui.showcase.demo.openSheet')}</Button>}
          title={t('ui.showcase.demo.sheetTitle')}
          description={o?.title}
        >
          {o && <OrderCard order={o} timeZone={TZ} showAssignees />}
        </SidePanel>
        <FormPanel
          trigger={<Button variant="outline">FormPanel</Button>}
          title={t('ui.showcase.demo.formTitle')}
          description={t('ui.showcase.demo.formDescription')}
          onSubmit={() => wait().then(() => scratchToast(t('ui.actions.save')))}
        >
          {formFields}
        </FormPanel>
      </Row>
    </ShowcaseSection>
  );
}

export function NavSection() {
  const [techActive, setTechActive] = React.useState('orders');
  const [officeActive, setOfficeActive] = React.useState('dashboard');
  const counts = useQuery({ queryKey: ['mock', 'dashboard'], queryFn: () => getDashboard() });
  const sync = useQuery({ queryKey: ['mock', 'sync'], queryFn: () => getSyncState() });
  const mine = useQuery({ queryKey: ['mock', 'my-orders'], queryFn: () => listMyOrders(MOCK_USER_IDS.technician) });

  const techItems: NavItem[] = [
    { id: 'orders', label: t('ui.nav.myOrders'), icon: ClipboardList },
    { id: 'pending', label: t('ui.nav.pending'), icon: ListTodo, badge: sync.data?.pending ?? 0 },
    { id: 'profile', label: t('ui.nav.profile'), icon: UserRound },
  ].map((item) => ({ ...item, active: item.id === techActive, onClick: () => setTechActive(item.id) }));

  const officeGroups = [
    {
      label: t('ui.showcase.demo.groupWork'),
      items: [
        { id: 'dashboard', label: t('ui.nav.dashboard'), icon: LayoutDashboard },
        { id: 'orders', label: t('ui.nav.orders'), icon: ClipboardList },
        { id: 'review', label: t('ui.nav.review'), icon: Inbox, badge: counts.data?.pending_approval ?? 0 },
        { id: 'clients', label: t('ui.nav.clients'), icon: Users },
      ],
    },
    {
      label: t('ui.showcase.demo.groupAdmin'),
      items: [
        { id: 'company', label: t('ui.nav.company'), icon: Building },
        { id: 'members', label: t('ui.nav.members'), icon: UserRound },
        { id: 'audit', label: t('ui.nav.audit'), icon: ScrollText },
      ],
    },
  ].map((g) => ({
    ...g,
    items: g.items.map((item) => ({
      ...item,
      active: item.id === officeActive,
      onClick: () => setOfficeActive(item.id),
    })),
  }));

  const managerName = getPerson(MOCK_USER_IDS.manager)?.full_name ?? '';
  const footer = (
    <UserChip
      name={managerName}
      seed={MOCK_USER_IDS.manager}
      memberRole="manager"
      size="sm"
      className="text-sidebar-accent-foreground"
    />
  );

  return (
    <ShowcaseSection id="nav" title={t('ui.showcase.sections.nav')}>
      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        <Demo label='TechnicianShell navPosition="static" · SyncIndicator · TechnicianBottomNav'>
          <div className="h-[560px] overflow-auto rounded-2xl border shadow-sm">
            <TechnicianShell
              className="min-h-full"
              navItems={techItems}
              navPosition="static"
              sync={sync.data && <SyncIndicator status={sync.data} timeZone={TZ} />}
            >
              <div className="flex flex-col gap-3">
                {mine.data?.slice(0, 4).map((o) => (
                  <OrderCard key={o.id} order={o} timeZone={TZ} isNew={o.is_new} />
                ))}
              </div>
            </TechnicianShell>
          </div>
        </Demo>
        <div className="flex min-w-0 flex-col gap-6">
          <Demo label="OfficeSidebar · collapsed · OfficeTopbar">
            <div className="flex h-[440px] overflow-hidden rounded-2xl border">
              <OfficeSidebar groups={officeGroups} footer={footer} />
              <OfficeSidebar groups={officeGroups} collapsed className="max-sm:hidden" />
              <div className="flex min-w-0 flex-1 flex-col bg-background">
                <OfficeTopbar
                  onMenu={() => scratchToast(t('ui.actions.toggleMenu'))}
                  title={t('ui.showcase.demo.officeNav')}
                  actions={<UserChip name={managerName} seed={MOCK_USER_IDS.manager} size="sm" />}
                />
              </div>
            </div>
          </Demo>
          <Demo label='TechnicianBottomNav position="static"'>
            <div className="overflow-hidden rounded-2xl border">
              <TechnicianBottomNav items={techItems} position="static" />
            </div>
          </Demo>
        </div>
      </div>
    </ShowcaseSection>
  );
}
