// Diálogos de exclusão do detalhe do cliente, com motivo (02). Editar o cliente e o endereço ficam nos formulários.
import { AddressBlock } from '@/components/address-block';
import { ReasonDialog } from '@/components/dialogs';
import { t } from '@/lib/i18n';
import type { ClientAddress } from '@/lib/views';
import { deleteAddress, deleteClient } from '../../api';
import { useOffice, useOfficeAction } from '../../session';
import type { ClientWithOpenOrders } from './client';

/** Excluir o cliente; `client_has_open_orders` volta para a tela mostrar a faixa (`onBlocked`). */
export function DeleteClientDialog({
  client: c,
  open,
  onOpenChange,
  onBlocked,
}: {
  client: ClientWithOpenOrders;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlocked: () => void;
}) {
  const { actor } = useOffice();
  const run = useOfficeAction();

  async function confirmDelete(reason: string) {
    const result = await run(t('office.clientDetail.delete'), () => deleteClient(c.id, reason, actor), {
      inline: ['client_has_open_orders'],
    });
    if (!result.ok && result.code === 'client_has_open_orders') onBlocked();
  }

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('office.clientDetail.deleteTitle', { name: c.name })}
      description={t('office.clientDetail.deleteDescription')}
      confirmLabel={t('office.clientDetail.delete')}
      onConfirm={confirmDelete}
    />
  );
}

export function DeleteAddressDialog({
  address,
  onClose,
}: {
  /** O endereço a excluir; `null` fecha o diálogo. */
  address: ClientAddress | null;
  onClose: () => void;
}) {
  const { actor } = useOffice();
  const run = useOfficeAction();
  return (
    <ReasonDialog
      open={address !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t('office.clientDetail.deleteAddressTitle')}
      description={t('office.clientDetail.deleteAddressDescription')}
      confirmLabel={t('office.clientDetail.deleteAddress')}
      onConfirm={(reason) =>
        address && run(t('office.clientDetail.deleteAddress'), () => deleteAddress(address.id, reason, actor))
      }
    >
      {address && <AddressBlock address={address} hideMap className="rounded-lg bg-muted/60 p-3" />}
    </ReasonDialog>
  );
}
