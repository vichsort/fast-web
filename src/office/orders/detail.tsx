// Detalhe da O.S.: dados, materiais, tentativas com fotos, cliente e local, técnicos e o histórico completo (03, 04).
import { getRouteApi, Link } from '@tanstack/react-router';
import {
  Ban,
  CircleCheck,
  ClipboardCheck,
  Ellipsis,
  FilePlus,
  Hourglass,
  MessageCircle,
  Pencil,
  RotateCw,
  UserRoundPen,
} from 'lucide-react';
import * as React from 'react';
import { AddressBlock, ContactActions } from '@/components/address-block';
import {
  LateSupplementBadge,
  OrderStatusBadge,
  OverdueBadge,
  PriorityBadge,
  ServiceTypeBadge,
  ToneBadge,
  UnassignedBadge,
} from '@/components/badges';
import { ConfirmDialog, FormDialog, ReasonDialog } from '@/components/dialogs';
import { ExecutionCard } from '@/components/execution-card';
import { Notice } from '@/components/notice';
import { DueLabel } from '@/components/order-card';
import { PageHeader } from '@/components/page-header';
import { SearchCombobox } from '@/components/search-combobox';
import { DetailItem, DetailList, Section } from '@/components/section';
import { LoadingDetail } from '@/components/states';
import { orderHistoryEntries, Timeline } from '@/components/timeline';
import { flagVar, statusVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { UserChip } from '@/components/user';
import { formatDate, formatDateTime, formatOrderNumber, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { acknowledgeSupplements, cancelOrder, seenUntil, setAssignees, updateMaterials } from '../api';
import { useOrder, usePersonName, useTechnicians } from '../queries';
import { useOffice, useOfficeAction } from '../session';
import { NotFound, textLink } from '../shared';

const route = getRouteApi('/office/orders/$orderId');

export function OrderDetailPage() {
  const { orderId } = route.useParams();
  const order = useOrder(orderId);
  if (order.isPending) return <LoadingDetail />;
  if (!order.data) return <NotFound back={<Link to="/office/orders" />} />;
  return <OrderDetailView order={order.data} />;
}

/**
 * URL de "Enviar pelo WhatsApp" (03): abre o WhatsApp de quem clicou, sem destinatário, com a mensagem e o link.
 * O link é o da O.S. na interface do técnico, que é quem recebe a mensagem.
 */
function shareUrl(o: OrderDetail): string {
  const link = `${window.location.origin}/technician/orders/${o.id}`;
  const text = t('office.orderDetail.whatsappMessage', {
    number: formatOrderNumber(o.order_number),
    title: o.title,
    client: o.client.name,
    link,
  });
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function OrderDetailView({ order: o }: { order: OrderDetail }) {
  const personName = usePersonName();
  const { timeZone, actor, company } = useOffice();
  const run = useOfficeAction();
  const [cancelling, setCancelling] = React.useState(false);
  const [reassigning, setReassigning] = React.useState(false);
  const closed = o.status === 'approved' || o.status === 'cancelled';
  const number = formatOrderNumber(o.order_number);
  const pending = o.attempts.find((a) => a.review_status === 'pending');
  const lateUnseen = o.attempts.flatMap((a) => a.supplements).filter((s) => s.is_late && !s.acknowledged_at);
  const approvedAttempt = [...o.attempts].reverse().find((a) => a.review_status === 'approved');
  const active = o.assignments.filter((a) => a.unassigned_at === null);
  const past = o.assignments.filter((a) => a.unassigned_at !== null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        size="lg"
        back={<Link to="/office/orders" />}
        eyebrow={t('office.orderDetail.eyebrow', {
          number,
          name: o.created_by_ref.full_name,
          time: formatRelative(o.created_at, timeZone),
        })}
        title={o.title}
        meta={
          <>
            <OrderStatusBadge status={o.status} />
            <PriorityBadge priority={o.priority} />
            <ServiceTypeBadge type={o.service_type} />
            {o.overdue && <OverdueBadge />}
            {o.assignees.length === 0 && !closed && <UnassignedBadge />}
            {o.late_supplements_unseen > 0 && <LateSupplementBadge count={o.late_supplements_unseen} />}
          </>
        }
        actions={
          <>
            {o.status === 'pending_approval' && (
              <Button render={<Link to="/office/review/$orderId" params={{ orderId: o.id }} />} nativeButton={false}>
                <ClipboardCheck />
                {t('office.orderDetail.review')}
              </Button>
            )}
            {!closed && (
              <Button
                variant="outline"
                render={<Link to="/office/orders/$orderId/edit" params={{ orderId: o.id }} />}
                nativeButton={false}
              >
                <Pencil />
                {t('office.common.edit')}
              </Button>
            )}
            <Button
              variant="outline"
              render={<a href={shareUrl(o)} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              <MessageCircle />
              {t('office.orderDetail.whatsapp')}
            </Button>
            {!closed && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon" aria-label={t('office.common.more')} />}
                >
                  <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setReassigning(true)}>
                    <UserRoundPen />
                    {t('office.orderDetail.reassign')}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setCancelling(true)}>
                    <Ban />
                    {t('office.orderDetail.cancel')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      {o.status === 'cancelled' && (
        <Notice toneClass={statusVar.cancelled} icon={Ban} title={t('office.orderDetail.cancelledTitle')}>
          {o.cancel_reason && <p className="whitespace-pre-line">{o.cancel_reason}</p>}
          {o.cancelled_at && (
            <p className="text-xs opacity-80">
              {t('office.orderDetail.cancelledBy', {
                name: personName(o.cancelled_by),
                time: formatDateTime(o.cancelled_at, timeZone),
              })}
            </p>
          )}
        </Notice>
      )}
      {o.status === 'approved' && (
        <Notice toneClass={statusVar.approved} icon={CircleCheck} title={t('office.orderDetail.approvedTitle')}>
          {approvedAttempt?.reviewer && approvedAttempt.reviewed_at && (
            <span>
              {t('ui.execution.reviewedBy', {
                name: approvedAttempt.reviewer.full_name,
                time: formatDateTime(approvedAttempt.reviewed_at, timeZone),
              })}
              {'. '}
            </span>
          )}
          {t('office.orderDetail.approvedDescription')}
        </Notice>
      )}
      {pending && o.status === 'pending_approval' && (
        <Notice
          toneClass={statusVar.pending_approval}
          icon={Hourglass}
          title={t('office.orderDetail.pendingTitle')}
          action={
            <Button
              size="sm"
              render={<Link to="/office/review/$orderId" params={{ orderId: o.id }} />}
              nativeButton={false}
            >
              {t('office.orderDetail.review')}
            </Button>
          }
        >
          {t('office.orderDetail.pendingDescription', {
            time: formatRelative(pending.received_at, timeZone),
          })}
        </Notice>
      )}
      {lateUnseen.length > 0 && (
        <Notice
          toneClass={flagVar.lateSupplement}
          icon={FilePlus}
          title={t('office.orderDetail.lateTitle', { count: lateUnseen.length })}
          action={
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="outline">
                  {t('office.orderDetail.acknowledge')}
                </Button>
              }
              title={t('office.review.lateAckTitle', { count: lateUnseen.length })}
              description={t('office.review.lateAckDescription')}
              confirmLabel={t('office.orderDetail.acknowledge')}
              onConfirm={() =>
                run(t('office.orderDetail.acknowledge'), () =>
                  acknowledgeSupplements(o.id, seenUntil(lateUnseen) ?? new Date().toISOString(), actor),
                )
              }
            />
          }
        >
          {t('office.orderDetail.lateDescription')}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title={t('office.orderDetail.sectionData')}>
            <DetailList columns={3}>
              <DetailItem label={t('office.orderDetail.serviceType')}>
                {t(`ui.serviceType.${o.service_type}`)}
              </DetailItem>
              <DetailItem label={t('office.orderDetail.priority')}>{t(`ui.priority.${o.priority}`)}</DetailItem>
              <DetailItem label={t('office.orderDetail.due')}>
                {o.due_at ? (
                  <span className="inline-flex flex-wrap items-baseline gap-1.5">
                    <DueLabel dueAt={o.due_at} overdue={o.overdue} timeZone={timeZone} />
                    <span className="text-xs text-muted-foreground">{formatDate(o.due_at, timeZone)}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t('office.orderDetail.noDue')}</span>
                )}
              </DetailItem>
              <DetailItem label={t('office.orderDetail.created')}>{formatDateTime(o.created_at, timeZone)}</DetailItem>
              <DetailItem label={t('office.orderDetail.updated')}>{formatRelative(o.updated_at, timeZone)}</DetailItem>
              <DetailItem label={t('office.orderDetail.instructions')} full>
                {o.instructions ?? (
                  <span className="text-muted-foreground">{t('office.orderDetail.noInstructions')}</span>
                )}
              </DetailItem>
            </DetailList>
          </Section>

          <MaterialsSection order={o} />

          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold">{t('office.orderDetail.sectionExecutions')}</h2>
            {o.attempts.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                {t('office.orderDetail.executionsEmpty')}
              </p>
            ) : (
              [...o.attempts].reverse().map((attempt) => (
                <ExecutionCard
                  key={attempt.id}
                  attempt={attempt}
                  timeZone={timeZone}
                  compactPhotos
                  actions={
                    attempt.review_status === 'pending' && o.status === 'pending_approval' ? (
                      <Button
                        size="sm"
                        render={<Link to="/office/review/$orderId" params={{ orderId: o.id }} />}
                        nativeButton={false}
                      >
                        {t('office.orderDetail.review')}
                      </Button>
                    ) : undefined
                  }
                />
              ))
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Section title={t('office.orderDetail.sectionClient')}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/office/clients/$clientId" params={{ clientId: o.client_id }} className={textLink}>
                  {o.client.name}
                </Link>
                {o.client.deleted_at && (
                  <ToneBadge tone="muted" size="sm" label={t('office.orderDetail.clientDeleted')} />
                )}
              </div>
              <ContactActions
                phone={o.client.phone}
                showNumber
                message={t('ui.contact.whatsappMessage', { name: o.client.name, company: company.name, number })}
              />
              {o.address ? (
                <AddressBlock address={o.address} />
              ) : (
                <p className="text-sm text-muted-foreground">{t('office.orderDetail.noAddress')}</p>
              )}
            </div>
          </Section>

          <Section
            title={t('office.orderDetail.sectionTechnicians')}
            actions={
              !closed && (
                <Button variant="ghost" size="sm" onClick={() => setReassigning(true)}>
                  <UserRoundPen />
                  {t('office.orderDetail.reassign')}
                </Button>
              )
            }
          >
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('office.orderDetail.noTechnicians')}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {active.map((a) => (
                  <li key={a.id}>
                    <UserChip
                      name={a.user.full_name}
                      seed={a.user_id}
                      size="sm"
                      subtitle={t('office.orderDetail.assignedSince', { time: formatDate(a.assigned_at, timeZone) })}
                    />
                  </li>
                ))}
              </ul>
            )}
            {past.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
                  {t('office.orderDetail.pastAssignments', { count: past.length })}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 flex flex-col gap-2 opacity-80">
                    {past.map((a) => (
                      <li key={a.id}>
                        <UserChip
                          name={a.user.full_name}
                          seed={a.user_id}
                          size="sm"
                          subtitle={t('office.orderDetail.pastAssignment', {
                            from: formatDate(a.assigned_at, timeZone),
                            to: formatDate(a.unassigned_at ?? a.assigned_at, timeZone),
                          })}
                        />
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            )}
          </Section>

          <Section title={t('office.orderDetail.sectionHistory')}>
            <Timeline
              entries={orderHistoryEntries(o.history, {
                timeZone,
                personName: (id) => personName(id),
              })}
              timeZone={timeZone}
              reverse
              groupByDay
              density="compact"
            />
          </Section>
        </div>
      </div>

      <ReasonDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title={t('ui.dialogs.cancelOrderTitle', { number })}
        description={t('ui.dialogs.cancelOrderDescription')}
        confirmLabel={t('ui.dialogs.cancelOrderConfirm')}
        onConfirm={(reason) => run(t('office.orderDetail.cancel'), () => cancelOrder(o.id, reason, actor))}
      >
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="font-semibold tabular-nums">{number}</span> · {o.title}
        </p>
      </ReasonDialog>
      <ReassignDialog order={o} open={reassigning} onOpenChange={setReassigning} />
    </div>
  );
}

/** Materiais: texto livre com detecção de conflito (03, R11): manda o texto visto no carregamento. */
function MaterialsSection({ order: o }: { order: OrderDetail }) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  const closed = o.status === 'approved' || o.status === 'cancelled';
  const [text, setText] = React.useState(o.materials_notes ?? '');
  const [expected, setExpected] = React.useState(o.materials_notes);
  const [saving, setSaving] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);
  const dirty = (text.trim() || null) !== expected;

  // Recarregou e ninguém está editando: acompanha o servidor.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando o texto do servidor muda
  React.useEffect(() => {
    if (!dirty) {
      setText(o.materials_notes ?? '');
      setExpected(o.materials_notes);
    }
  }, [o.materials_notes]);

  async function save() {
    setSaving(true);
    const result = await run(
      t('office.orderDetail.materialsSave'),
      () => updateMaterials(o.id, text, expected, actor),
      {
        inline: ['conflict'],
      },
    );
    setSaving(false);
    if (result.ok) {
      setExpected(text.trim() || null);
      setConflict(false);
    } else if (result.code === 'conflict') setConflict(true);
  }

  function reload() {
    setText(o.materials_notes ?? '');
    setExpected(o.materials_notes);
    setConflict(false);
  }

  return (
    <Section title={t('office.orderDetail.sectionMaterials')} description={t('office.orderDetail.materialsHint')}>
      {closed ? (
        <p className={o.materials_notes ? 'whitespace-pre-line' : 'text-muted-foreground'}>
          {o.materials_notes ?? t('office.orderDetail.materialsEmpty')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {conflict && (
            <Notice
              tone="warning"
              title={t('office.orderDetail.materialsConflict')}
              action={
                <Button size="sm" variant="outline" onClick={reload}>
                  <RotateCw />
                  {t('office.common.reload')}
                </Button>
              }
            />
          )}
          <Textarea
            aria-label={t('office.orderDetail.sectionMaterials')}
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('office.orderForm.materialsPlaceholder')}
          />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={() => void save()}>
              {saving && <Spinner aria-hidden />}
              {t('office.orderDetail.materialsSave')}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function ReassignDialog({
  order: o,
  open,
  onOpenChange,
}: {
  order: OrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  const technicians = useTechnicians();
  const [ids, setIds] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (open) setIds(o.assignees.map((a) => a.id));
  }, [open, o.assignees]);
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('office.orderDetail.reassignTitle', { number: formatOrderNumber(o.order_number) })}
      description={t('office.orderDetail.reassignDescription')}
      onSubmit={() => run(t('office.orderDetail.reassign'), () => setAssignees(o.id, ids, actor))}
    >
      <SearchCombobox
        multiple
        avatars
        aria-label={t('office.orderForm.technicians')}
        value={ids}
        onValueChange={setIds}
        loading={technicians.isPending}
        placeholder={t('office.orderForm.techniciansPlaceholder')}
        options={(technicians.data ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
      />
      <p className="mt-2 text-xs text-muted-foreground">{t('office.orderForm.techniciansHint')}</p>
    </FormDialog>
  );
}
