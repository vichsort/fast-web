// Endereços do cliente (02): ativos com o principal marcado (ou o aviso de sem principal), o menu de cada um e,
// recolhidos, os excluídos com o motivo.
import { Ellipsis, MapPinPlus, Pencil, Star, Trash2 } from 'lucide-react';
import { AddressBlock } from '@/components/address-block';
import { Section } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { t } from '@/lib/i18n';
import type { ClientAddress } from '@/lib/views';
import { setPrimaryAddress } from '../../api';
import { useOfficeAction } from '../../session';
import type { ClientWithOpenOrders } from './client';

export function AddressesSection({
  client: c,
  onAdd,
  onEdit,
  onDelete,
}: {
  client: ClientWithOpenOrders;
  onAdd: () => void;
  onEdit: (address: ClientAddress) => void;
  onDelete: (address: ClientAddress) => void;
}) {
  const run = useOfficeAction();
  const deleted = c.deleted_at !== null;
  const active = c.addresses.filter((a) => a.deleted_at === null);
  const removed = c.addresses.filter((a) => a.deleted_at !== null);
  return (
    <Section
      title={t('office.clientDetail.sectionAddresses')}
      actions={
        !deleted && (
          <Button variant="ghost" size="sm" onClick={onAdd}>
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
                      onPrimary={() => void run(t('office.clientDetail.makePrimary'), () => setPrimaryAddress(a.id))}
                      onEdit={() => onEdit(a)}
                      onDelete={() => onDelete(a)}
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
