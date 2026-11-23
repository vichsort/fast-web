// Detalhe do cliente (02): dados, endereços (principal, adicionar, editar, excluir com motivo), histórico de O.S. e
// exclusão com motivo (client_has_open_orders quando há O.S. em andamento).
// Cada bloco é uma seção em ./detail/ (nomes em docs/screens-office.md).
import { getRouteApi, Link } from '@tanstack/react-router';
import * as React from 'react';
import { LoadingDetail } from '@/components/states';
import type { ClientAddress } from '@/lib/views';
import { useClient } from '../queries';
import { NotFound } from '../shared';
import { AddressDialog } from './address-form';
import { EditClientDialog } from './client-form';
import { AddressesSection } from './detail/addresses-section';
import type { ClientWithOpenOrders } from './detail/client';
import { ClientDataSection } from './detail/data-section';
import { DeleteAddressDialog, DeleteClientDialog } from './detail/dialogs';
import { ClientHeader } from './detail/header';
import { DeletedClientNotice, OpenOrdersNotice } from './detail/notices';
import { ClientOrdersSection } from './detail/orders-section';

const route = getRouteApi('/office/clients/$clientId');

export function ClientDetailPage() {
  const { clientId } = route.useParams();
  const client = useClient(clientId);
  if (client.isPending) return <LoadingDetail />;
  if (!client.data) return <NotFound back={<Link to="/office/clients" />} />;
  return <ClientView client={client.data} />;
}

function ClientView({ client: c }: { client: ClientWithOpenOrders }) {
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [addressDialog, setAddressDialog] = React.useState<{ address?: ClientAddress } | null>(null);
  const [deletingAddress, setDeletingAddress] = React.useState<ClientAddress | null>(null);
  const deleted = c.deleted_at !== null;

  return (
    <div className="flex flex-col gap-6">
      <ClientHeader client={c} onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />
      {deleted && <DeletedClientNotice client={c} />}
      {blocked && !deleted && <OpenOrdersNotice client={c} />}

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <ClientDataSection client={c} />
          <AddressesSection
            client={c}
            onAdd={() => setAddressDialog({})}
            onEdit={(address) => setAddressDialog({ address })}
            onDelete={setDeletingAddress}
          />
        </div>

        <ClientOrdersSection client={c} />
      </div>

      <EditClientDialog open={editing} onOpenChange={setEditing} client={c} />
      <DeleteClientDialog client={c} open={deleting} onOpenChange={setDeleting} onBlocked={() => setBlocked(true)} />
      <AddressDialog
        open={addressDialog !== null}
        onOpenChange={(open) => !open && setAddressDialog(null)}
        clientId={c.id}
        address={addressDialog?.address}
      />
      <DeleteAddressDialog address={deletingAddress} onClose={() => setDeletingAddress(null)} />
    </div>
  );
}
