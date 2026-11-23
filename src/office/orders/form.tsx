// Criar e editar O.S. (03: create_order; na edição, um update_order só, com materiais e técnicos quando mudaram).
// `conflict` nos materiais (R11) aparece no lugar: o texto atual ao lado do digitado, e só salva depois da escolha.
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { GitCompareArrows, Lock, MapPinPlus, TriangleExclamationPoint } from 'lucide-react';
import * as React from 'react';
import { ToneBadge } from '@/components/badges';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { DatePicker } from '@/components/period-picker';
import { SearchCombobox } from '@/components/search-combobox';
import { Section } from '@/components/section';
import { ErrorState, LoadingDetail } from '@/components/states';
import { priorityVar } from '@/components/tone';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ORDER_PRIORITIES, type OrderPriority, SERVICE_TYPES, type ServiceType } from '@/lib/enums';
import { calendarDay, formatOrderNumber, formatPhone } from '@/lib/format';
import { errorMessage, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { OrderDetail } from '@/lib/views';
import { addressText, createOrder, updateOrder } from '../api';
import { AddressDialog } from '../clients/address-form';
import { QuickClientDialog } from '../clients/client-form';
import { useClient, useClients, useOrder, useTechnicians } from '../queries';
import { useOffice, useOfficeAction } from '../session';
import { ChoiceCards, NotFound } from '../shared';
import { conflictCurrent, NO_ADDRESS, orderEdit } from './edit';

const newRoute = getRouteApi('/office/orders/new');
const editRoute = getRouteApi('/office/orders/$orderId/edit');

export function OrderNewPage() {
  const { client } = newRoute.useSearch();
  return <OrderForm initialClientId={client ?? null} />;
}

export function OrderEditPage() {
  const { orderId } = editRoute.useParams();
  const order = useOrder(orderId);
  if (order.isPending) return <LoadingDetail />;
  if (!order.data) return <NotFound back={<Link to="/office/orders" />} />;
  const o = order.data;
  // 03, R9: approved → invalid_status; cancelled → order_closed.
  if (o.status === 'approved' || o.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-2">
        <ErrorState
          title={t('office.orderForm.lockedTitle')}
          code={o.status === 'approved' ? 'invalid_status' : 'order_closed'}
        />
        <Button
          variant="outline"
          render={<Link to="/office/orders/$orderId" params={{ orderId: o.id }} />}
          nativeButton={false}
        >
          {t('ui.order.number', { number: formatOrderNumber(o.order_number) })}
        </Button>
      </div>
    );
  }
  return <OrderForm order={o} />;
}

/** Materiais recusados por `conflict`: o texto digitado, o atual do banco e qual dos dois o usuário escolheu. */
interface MaterialsConflictState {
  mine: string;
  current: string;
  choice: 'mine' | 'current' | null;
}

function OrderForm({ order, initialClientId = null }: { order?: OrderDetail; initialClientId?: string | null }) {
  const { timeZone, actor } = useOffice();
  const navigate = useNavigate();
  const run = useOfficeAction();
  const editing = order !== undefined;
  const [orderId] = React.useState(() => order?.id ?? crypto.randomUUID());

  const [clientId, setClientId] = React.useState<string | null>(order?.client_id ?? initialClientId);
  const [addressId, setAddressId] = React.useState<string>(order?.client_address_id ?? NO_ADDRESS);
  const [title, setTitle] = React.useState(order?.title ?? '');
  const [serviceType, setServiceType] = React.useState<ServiceType | null>(order?.service_type ?? null);
  const [priority, setPriority] = React.useState<OrderPriority>(order?.priority ?? 'normal');
  const [dueDate, setDueDate] = React.useState<string | null>(
    order?.due_at ? calendarDay(order.due_at, timeZone) : null,
  );
  const [instructions, setInstructions] = React.useState(order?.instructions ?? '');
  const [materials, setMaterials] = React.useState(order?.materials_notes ?? '');
  const [assignees, setAssigneesState] = React.useState<string[]>(order?.assignees.map((a) => a.id) ?? []);
  const [showErrors, setShowErrors] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [quickClient, setQuickClient] = React.useState<string | null>(null);
  const [addingAddress, setAddingAddress] = React.useState(false);
  // O que a tela carregou: a base do "mudou?" dos materiais e dos técnicos, e o `expected` dos materiais até um
  // `conflict` mostrar o texto atual (as leituras recarregam depois da recusa; o carregado não muda com elas).
  const [loaded] = React.useState(() => ({
    materials_notes: order?.materials_notes ?? null,
    assignee_ids: order?.assignees.map((a) => a.id) ?? [],
  }));
  const [expected, setExpected] = React.useState(loaded.materials_notes);
  const [conflict, setConflict] = React.useState<MaterialsConflictState | null>(null);
  const [conflictUnchosen, setConflictUnchosen] = React.useState(false);
  const conflictRef = React.useRef<HTMLDivElement>(null);

  const clients = useClients();
  const client = useClient(clientId);
  const technicians = useTechnicians();

  // Na criação, o endereço principal vem selecionado ao escolher o cliente (03, "Funcionalidades").
  const loadedClient = client.data?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: só quando muda o cliente, não a cada recarga
  React.useEffect(() => {
    if (editing || !loadedClient || !client.data) return;
    const primary = client.data.addresses.find((a) => a.is_primary && a.deleted_at === null);
    setAddressId(primary?.id ?? NO_ADDRESS);
  }, [loadedClient, editing]);

  const invalid = { client: !clientId, title: !title.trim(), type: !serviceType };
  const hasErrors = invalid.client || invalid.title || invalid.type;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (hasErrors || !clientId || !serviceType) {
      setShowErrors(true);
      // Leva ao primeiro campo com problema (o aviso fica no topo do formulário).
      requestAnimationFrame(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus());
      return;
    }
    setSubmitting(true);
    const fields = {
      client_address_id: addressId === NO_ADDRESS ? null : addressId,
      service_type: serviceType,
      title,
      instructions,
      priority,
      due_date: dueDate,
    };
    if (!order) {
      const result = await run(t('office.orderForm.created'), () =>
        createOrder(
          { id: orderId, client_id: clientId, ...fields, materials_notes: materials, assignee_ids: assignees },
          actor,
        ),
      );
      setSubmitting(false);
      if (result.ok) void navigate({ to: '/office/orders/$orderId', params: { orderId: result.value.id } });
      return;
    }
    // Depois de um `conflict`, só salva com a escolha feita: nunca grava por cima do texto atual sem mostrá-lo.
    if (conflict && conflict.choice === null) {
      setSubmitting(false);
      setConflictUnchosen(true);
      requestAnimationFrame(() => conflictRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const edit = orderEdit(
      loaded,
      { ...fields, address_id: addressId, instructions, materials, assignee_ids: assignees },
      expected,
    );
    const result = await run(t('office.orderForm.saved'), () => updateOrder(order.id, edit, actor), {
      inline: ['conflict'],
    });
    setSubmitting(false);
    if (result.ok) {
      void navigate({ to: '/office/orders/$orderId', params: { orderId: order.id } });
      return;
    }
    if (result.code === 'conflict') {
      setConflict({ mine: materials, current: conflictCurrent(result.details), choice: null });
      setConflictUnchosen(false);
      requestAnimationFrame(() => {
        conflictRef.current?.scrollIntoView({ block: 'center' });
        conflictRef.current?.focus();
      });
    }
  }

  function chooseMaterials(choice: 'mine' | 'current') {
    if (!conflict) return;
    setConflict({ ...conflict, choice });
    setConflictUnchosen(false);
    setMaterials(conflict[choice]);
    // O texto atual já foi mostrado: é ele que o banco tem que ter para gravar a escolha.
    setExpected(conflict.current || null);
  }

  const activeAddresses = client.data?.addresses.filter((a) => a.deleted_at === null) ?? [];
  const keptAddress =
    order?.client_address_id && !activeAddresses.some((a) => a.id === order.client_address_id)
      ? { id: order.client_address_id, text: order.address ?? '' }
      : null;
  const back = order ? (
    <Link to="/office/orders/$orderId" params={{ orderId: order.id }} />
  ) : (
    <Link to="/office/orders" />
  );

  // Os diálogos ficam fora do <form>: o submit deles subiria pela árvore do React até o desta tela.
  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <PageHeader
          size="lg"
          back={back}
          eyebrow={order ? order.client.name : undefined}
          title={
            order
              ? t('office.orderForm.editTitle', { number: formatOrderNumber(order.order_number) })
              : t('office.orderForm.newTitle')
          }
          description={t(order ? 'office.orderForm.editDescription' : 'office.orderForm.newDescription')}
        />
        {showErrors && hasErrors && (
          <Notice tone="danger" icon={TriangleExclamationPoint} title={t('office.orderForm.errorTitle')} />
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <Section title={t('office.orderForm.sectionClient')}>
              <FieldGroup className="gap-5">
                <Field data-invalid={(showErrors && invalid.client) || undefined}>
                  <FieldLabel htmlFor="order-client">{t('office.orderForm.client')}</FieldLabel>
                  {editing ? (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                      <Lock aria-hidden className="size-4 text-muted-foreground" />
                      <span className="font-medium">{order.client.name}</span>
                      <span className="text-muted-foreground">· {t('office.orderForm.clientLocked')}</span>
                    </div>
                  ) : (
                    <SearchCombobox
                      id="order-client"
                      value={clientId}
                      onValueChange={setClientId}
                      loading={clients.isPending}
                      placeholder={t('office.orderForm.clientPlaceholder')}
                      aria-invalid={showErrors && invalid.client}
                      options={(clients.data ?? []).map((c) => ({
                        value: c.id,
                        label: c.name,
                        description: [c.phone && formatPhone(c.phone), c.primary_address?.district]
                          .filter(Boolean)
                          .join(' · '),
                        keywords: c.phone ? [c.phone] : undefined,
                      }))}
                      onCreate={(text) => setQuickClient(text)}
                    />
                  )}
                  {showErrors && invalid.client && <FieldError>{t('office.common.fieldRequired')}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel>{t('office.orderForm.address')}</FieldLabel>
                  {!clientId ? (
                    <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                      {t('office.orderForm.pickClientFirst')}
                    </p>
                  ) : client.isPending ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Spinner aria-hidden />
                      {t('ui.states.loading')}
                    </div>
                  ) : (
                    <>
                      <ChoiceCards
                        aria-label={t('office.orderForm.address')}
                        value={addressId}
                        onValueChange={setAddressId}
                        columns={2}
                        options={[
                          ...activeAddresses.map((a) => ({
                            value: a.id,
                            label: a.label ?? a.street,
                            aside: a.is_primary ? (
                              <ToneBadge tone="brand" size="sm" label={t('ui.badge.primary')} />
                            ) : null,
                            description: addressText(a),
                          })),
                          ...(keptAddress
                            ? [
                                {
                                  value: keptAddress.id,
                                  label: t('office.orderForm.keptAddress'),
                                  aside: <ToneBadge tone="muted" size="sm" label={t('ui.badge.deleted')} />,
                                  description: keptAddress.text,
                                },
                              ]
                            : []),
                          {
                            value: NO_ADDRESS,
                            label: t('office.orderForm.noAddress'),
                            description:
                              activeAddresses.length === 0
                                ? t('office.orderForm.clientWithoutAddress')
                                : t('office.orderForm.noAddressHint'),
                          },
                        ]}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <FieldDescription>{t('office.orderForm.addressCopyHint')}</FieldDescription>
                        {client.data && client.data.deleted_at === null && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setAddingAddress(true)}>
                            <MapPinPlus />
                            {t('office.orderForm.addAddressLink')}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </Field>
              </FieldGroup>
            </Section>

            <Section title={t('office.orderForm.sectionService')}>
              <FieldGroup className="gap-5">
                <Field data-invalid={(showErrors && invalid.title) || undefined}>
                  <FieldLabel htmlFor="order-title">{t('office.orderForm.title')}</FieldLabel>
                  <Input
                    id="order-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t('office.orderForm.titlePlaceholder')}
                    aria-invalid={(showErrors && invalid.title) || undefined}
                  />
                  {showErrors && invalid.title && <FieldError>{t('office.common.fieldRequired')}</FieldError>}
                </Field>
                <Field data-invalid={(showErrors && invalid.type) || undefined}>
                  <FieldLabel>{t('office.orderForm.serviceType')}</FieldLabel>
                  <ChoiceCards
                    aria-label={t('office.orderForm.serviceType')}
                    value={serviceType}
                    onValueChange={setServiceType}
                    columns={3}
                    invalid={showErrors && invalid.type}
                    options={SERVICE_TYPES.map((s) => ({ value: s, label: t(`ui.serviceType.${s}`) }))}
                  />
                  {showErrors && invalid.type && <FieldError>{t('office.common.fieldRequired')}</FieldError>}
                </Field>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field>
                    <FieldLabel>{t('office.orderForm.priority')}</FieldLabel>
                    <ToggleGroup
                      aria-label={t('office.orderForm.priority')}
                      variant="outline"
                      spacing={0}
                      value={[priority]}
                      onValueChange={(values) => values[0] && setPriority(values[0] as OrderPriority)}
                      className="w-full"
                    >
                      {ORDER_PRIORITIES.map((p) => (
                        <ToggleGroupItem
                          key={p}
                          value={p}
                          className={cn(
                            'flex-1 gap-1.5 aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90',
                            priorityVar[p],
                          )}
                          aria-label={t(`ui.priorityLong.${p}`)}
                        >
                          <span
                            aria-hidden
                            className="tone-fill size-2 shrink-0 rounded-full ring-1 ring-background/60"
                          />
                          {t(`ui.priority.${p}`)}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="order-due">{t('office.orderForm.due')}</FieldLabel>
                    <DatePicker
                      id="order-due"
                      value={dueDate}
                      onValueChange={setDueDate}
                      timeZone={timeZone}
                      disablePast={!editing}
                      clearable
                      className="w-full"
                    />
                  </Field>
                </div>
                <FieldDescription className="-mt-3">{t('office.orderForm.dueHint')}</FieldDescription>
                <Field>
                  <FieldLabel htmlFor="order-instructions">
                    {t('office.orderForm.instructions')}{' '}
                    <span className="font-normal text-muted-foreground">{t('office.common.optional')}</span>
                  </FieldLabel>
                  <Textarea
                    id="order-instructions"
                    rows={5}
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder={t('office.orderForm.instructionsPlaceholder')}
                  />
                </Field>
              </FieldGroup>
            </Section>
          </div>

          <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
            <Section title={t('office.orderForm.sectionTechnicians')}>
              <Field>
                <FieldLabel htmlFor="order-techs" className="sr-only">
                  {t('office.orderForm.technicians')}
                </FieldLabel>
                <SearchCombobox
                  id="order-techs"
                  multiple
                  avatars
                  value={assignees}
                  onValueChange={setAssigneesState}
                  loading={technicians.isPending}
                  placeholder={t('office.orderForm.techniciansPlaceholder')}
                  options={(technicians.data ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
                />
                <FieldDescription>{t('office.orderForm.techniciansHint')}</FieldDescription>
              </Field>
            </Section>
            <Section title={t('office.orderForm.sectionMaterials')}>
              {conflict && (
                <MaterialsConflict
                  ref={conflictRef}
                  conflict={conflict}
                  onChoose={chooseMaterials}
                  unchosen={conflictUnchosen}
                />
              )}
              <Field>
                <FieldLabel htmlFor="order-materials">{t('office.orderForm.materials')}</FieldLabel>
                <Textarea
                  id="order-materials"
                  rows={5}
                  value={materials}
                  onChange={(event) => setMaterials(event.target.value)}
                  placeholder={t('office.orderForm.materialsPlaceholder')}
                />
                <FieldDescription>{t('office.orderForm.materialsHint')}</FieldDescription>
              </Field>
            </Section>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
          <Button type="button" variant="outline" render={back} nativeButton={false}>
            {t('office.common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner aria-hidden />}
            {t(order ? 'office.orderForm.saved' : 'office.orderForm.created')}
          </Button>
        </div>
        <span className="sr-only" aria-live="polite">
          {showErrors && hasErrors ? errorMessage('invalid_input') : ''}
        </span>
      </form>
      <QuickClientDialog
        open={quickClient !== null}
        onOpenChange={(open) => !open && setQuickClient(null)}
        initialName={quickClient ?? ''}
        onCreated={(id) => {
          setClientId(id);
          setAddressId(NO_ADDRESS);
        }}
      />
      {clientId && (
        <AddressDialog
          open={addingAddress}
          onOpenChange={setAddingAddress}
          clientId={clientId}
          onSaved={(id) => setAddressId(id)}
        />
      )}
    </>
  );
}

/** `conflict` nos materiais (R11): o texto atual da O.S. ao lado do digitado; escolher um põe o texto no campo. */
function MaterialsConflict({
  ref,
  conflict,
  onChoose,
  unchosen,
}: {
  ref: React.Ref<HTMLDivElement>;
  conflict: MaterialsConflictState;
  onChoose: (choice: 'mine' | 'current') => void;
  /** Tentou salvar sem escolher. */
  unchosen: boolean;
}) {
  const text = (value: string) => (
    <span className="whitespace-pre-line">{value.trim() ? value : t('office.orderForm.conflictEmpty')}</span>
  );
  return (
    <div ref={ref} tabIndex={-1} className="flex flex-col gap-3 outline-none">
      <Notice tone="warning" icon={GitCompareArrows} layout="stacked" title={t('office.orderForm.conflictTitle')}>
        {t('office.orderForm.conflictBody')}
      </Notice>
      <Field data-invalid={unchosen || undefined}>
        <ChoiceCards
          aria-label={t('office.orderForm.conflictTitle')}
          value={conflict.choice}
          onValueChange={onChoose}
          invalid={unchosen}
          options={[
            { value: 'current', label: t('office.orderForm.conflictCurrent'), description: text(conflict.current) },
            { value: 'mine', label: t('office.orderForm.conflictMine'), description: text(conflict.mine) },
          ]}
        />
        {unchosen && <FieldError>{t('office.orderForm.conflictChoose')}</FieldError>}
      </Field>
    </div>
  );
}
