// Detalhe do cliente (02): dados, endereços (principal, adicionar, editar, excluir com motivo), histórico de O.S. e
// exclusão com motivo (client_has_open_orders quando há O.S. em andamento).
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { Ban, Ellipsis, MapPinPlus, Pencil, Plus, Star, Trash2, TriangleExclamationPoint } from 'lucide-react';
import * as React from 'react';
import { AddressBlock, ContactActions } from '@/components/address-block';
import { ToneBadge } from '@/components/badges';
import { ReasonDialog } from '@/components/dialogs';
import { OrderTable } from '@/components/order-table';
import { PageHeader } from '@/components/page-header';
import { DetailItem, DetailList, Section } from '@/components/section';
import { EmptyState, LoadingDetail } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ACTIVE_ORDER_STATUSES } from '@/lib/enums';
import { formatDate, formatDateTime } from '@/lib/format';
import { errorMessage, t } from '@/lib/i18n';
import type { ClientAddress, ClientDetail, OfficeOrderListItem } from '@/lib/views';
import { deleteAddress, deleteClient, setPrimaryAddress } from '../api';
import { useClient, usePersonName } from '../queries';
import { useOffice, useOfficeAction } from '../session';
import { NotFound, Notice } from '../shared';
import { AddressDialog } from './address-form';
import { EditClientDialog } from './client-form';

const route = getRouteApi('/office/clients/$clientId');

export function ClientDetailPage() {
  const { clientId } = route.useParams();
  const client = useClient(clientId);
  if (client.isPending) return <LoadingDetail />;
  if (!client.data) return <NotFound back={<Link to="/office/clients" />} />;
  return <ClientView client={client.data} />;
}

function ClientView({ client: c }: { client: ClientDetail & { open_orders: number } }) {
  const personName = usePersonName();
  const { timeZone, actor } = useOffice();
  const navigate = useNavigate();
  const run = useOfficeAction();
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [addressDialog, setAddressDialog] = React.useState<{ address?: ClientAddress } | null>(null);
  const [deletingAddress, setDeletingAddress] = React.useState<ClientAddress | null>(null);
  const deleted = c.deleted_at !== null;
  const active = c.addresses.filter((a) => a.deleted_at === null);
  const removed = c.addresses.filter((a) => a.deleted_at !== null);

  async function confirmDelete(reason: string) {
    const result = await run(t('office.clientDetail.delete'), () => deleteClient(c.id, reason, actor), {
      inline: ['client_has_open_orders'],
    });
    if (!result.ok && result.code === 'client_has_open_orders') setBlocked(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        size="lg"
        back={<Link to="/office/clients" />}
        title={c.name}
        meta={
          <>
            {deleted && <ToneBadge tone="muted" label={t('ui.badge.deleted')} />}
            {c.open_orders > 0 && (
              <ToneBadge tone="info" label={t('office.clientDetail.openOrders', { count: c.open_orders })} />
            )}
          </>
        }
        actions={
          !deleted && (
            <>
              <Button render={<Link to="/office/orders/new" search={{ client: c.id }} />} nativeButton={false}>
                <Plus />
                {t('office.clientDetail.newOrder')}
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil />
                {t('office.common.edit')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon" aria-label={t('office.common.more')} />}
                >
                  <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                    <Trash2 />
                    {t('office.clientDetail.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )
        }
      />

      {deleted && (
        <Notice
          tone="muted"
          icon={Ban}
          title={t('office.clientDetail.deletedTitle')}
          description={
            <>
              <p>{t('office.clientDetail.deletedDescription')}</p>
              {c.delete_reason && <p>{t('office.common.reason', { reason: c.delete_reason })}</p>}
              {c.deleted_at && (
                <p className="text-xs opacity-80">
                  {t('office.common.deletedBy', {
                    name: personName(c.deleted_by),
                    time: formatDateTime(c.deleted_at, timeZone),
                  })}
                </p>
              )}
            </>
          }
        />
      )}
      {blocked && !deleted && (
        <Notice
          tone="danger"
          icon={TriangleExclamationPoint}
          title={errorMessage('client_has_open_orders')}
          description={t('office.clientDetail.hasOpenOrders')}
          action={
            <Button
              size="sm"
              variant="outline"
              render={<Link to="/office/orders" search={{ client: c.id, status: [...ACTIVE_ORDER_STATUSES] }} />}
              nativeButton={false}
            >
              {t('office.clientDetail.seeOpenOrders')}
            </Button>
          }
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title={t('office.clientDetail.sectionData')}>
            <DetailList columns={1}>
              <DetailItem label={t('office.clientDetail.phone')}>
                {c.phone ? (
                  <ContactActions phone={c.phone} showNumber className="pt-1" />
                ) : (
                  <span className="text-muted-foreground">{t('office.clientDetail.noPhone')}</span>
                )}
              </DetailItem>
              <DetailItem label={t('office.clientDetail.notes')}>
                {c.notes ?? <span className="text-muted-foreground">{t('office.clientDetail.noNotes')}</span>}
              </DetailItem>
              <DetailItem label={t('office.clientDetail.since')}>{formatDate(c.created_at, timeZone)}</DetailItem>
            </DetailList>
          </Section>

          <Section
            title={t('office.clientDetail.sectionAddresses')}
            actions={
              !deleted && (
                <Button variant="ghost" size="sm" onClick={() => setAddressDialog({})}>
                  <MapPinPlus />
                  {t('office.clientDetail.addAddress')}
                </Button>
              )
            }
          >
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('office.clientDetail.noAddresses')}</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {!active.some((a) => a.is_primary) && (
                  <li className="pb-3 text-xs text-muted-foreground">{t('office.clientDetail.noPrimary')}</li>
                )}
                {active.map((a) => (
                  <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <AddressBlock
                      address={a}
                      primary={a.is_primary}
                      hideMap
                      actions={
                        !deleted && (
                          <AddressMenu
                            address={a}
                            onPrimary={() =>
                              void run(t('office.clientDetail.makePrimary'), () => setPrimaryAddress(a.id))
                            }
                            onEdit={() => setAddressDialog({ address: a })}
                            onDelete={() => setDeletingAddress(a)}
                          />
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
            {removed.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
                  {t('office.clientDetail.deletedAddresses', { count: removed.length })}
                </CollapsibleTrigger>
                <CollapsibleContent className="flex flex-col gap-3 pt-3">
                  {removed.map((a) => (
                    <div key={a.id} className="flex flex-col gap-1">
                      <AddressBlock address={a} deleted hideMap />
                      {a.delete_reason && (
                        <p className="pl-11 text-xs text-muted-foreground">
                          {t('office.common.reason', { reason: a.delete_reason })}
                        </p>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </Section>
        </div>

        <Section title={t('office.clientDetail.sectionOrders')} className="min-w-0 self-start">
          <OrderTable<OfficeOrderListItem>
            rows={c.orders}
            timeZone={timeZone}
            include={['number', 'title', 'status', 'assignees', 'due']}
            pageSize={10}
            density="compact"
            onRowClick={(o) => void navigate({ to: '/office/orders/$orderId', params: { orderId: o.id } })}
            empty={<EmptyState size="sm" title={t('office.clientDetail.ordersEmpty')} />}
          />
        </Section>
      </div>

      <EditClientDialog open={editing} onOpenChange={setEditing} client={c} />
      <ReasonDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('office.clientDetail.deleteTitle', { name: c.name })}
        description={t('office.clientDetail.deleteDescription')}
        confirmLabel={t('office.clientDetail.delete')}
        onConfirm={confirmDelete}
      />
      <AddressDialog
        open={addressDialog !== null}
        onOpenChange={(open) => !open && setAddressDialog(null)}
        clientId={c.id}
        address={addressDialog?.address}
      />
      <ReasonDialog
        open={deletingAddress !== null}
        onOpenChange={(open) => !open && setDeletingAddress(null)}
        title={t('office.clientDetail.deleteAddressTitle')}
        description={t('office.clientDetail.deleteAddressDescription')}
        confirmLabel={t('office.clientDetail.deleteAddress')}
        onConfirm={(reason) =>
          deletingAddress &&
          run(t('office.clientDetail.deleteAddress'), () => deleteAddress(deletingAddress.id, reason, actor))
        }
      >
        {deletingAddress && <AddressBlock address={deletingAddress} hideMap className="rounded-lg bg-muted/60 p-3" />}
      </ReasonDialog>
    </div>
  );
}

function AddressMenu({
  address,
  onPrimary,
  onEdit,
  onDelete,
}: {
  address: ClientAddress;
  onPrimary: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('office.clientDetail.addressActions', { label: address.label ?? address.street })}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {!address.is_primary && (
          <DropdownMenuItem onClick={onPrimary}>
            <Star />
            {t('office.clientDetail.makePrimary')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          {t('office.clientDetail.editAddress')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          {t('office.clientDetail.deleteAddress')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
