// Topo do detalhe do cliente: nome, selos (excluído, O.S. em andamento) e as ações (Nova O.S., editar, excluir).
import { Link } from '@tanstack/react-router';
import { Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react';
import { ToneBadge } from '@/components/badges';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { t } from '@/lib/i18n';
import type { ClientWithOpenOrders } from './client';

export function ClientHeader({
  client: c,
  onEdit,
  onDelete,
}: {
  client: ClientWithOpenOrders;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deleted = c.deleted_at !== null;
  return (
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
            <Button variant="outline" onClick={onEdit}>
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
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 />
                  {t('office.clientDetail.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )
      }
    />
  );
}
