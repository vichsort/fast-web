// Topo do detalhe da O.S.: número, autor, selos e as ações (revisar, editar, WhatsApp, reatribuir, cancelar).
import { Link } from '@tanstack/react-router';
import { Ban, ClipboardCheck, Ellipsis, MessageCircle, Pencil, UserRoundPen } from 'lucide-react';
import {
  LateSupplementBadge,
  OrderStatusBadge,
  OverdueBadge,
  PriorityBadge,
  ServiceTypeBadge,
  UnassignedBadge,
} from '@/components/badges';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatOrderNumber, formatRelative } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { useOffice } from '../../session';

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

export function OrderHeader({
  order: o,
  onReassign,
  onCancel,
}: {
  order: OrderDetail;
  onReassign: () => void;
  onCancel: () => void;
}) {
  const { timeZone } = useOffice();
  const closed = o.status === 'approved' || o.status === 'cancelled';
  return (
    <PageHeader
      size="lg"
      back={<Link to="/office/orders" />}
      eyebrow={t('office.orderDetail.eyebrow', {
        number: formatOrderNumber(o.order_number),
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
                <DropdownMenuItem onClick={onReassign}>
                  <UserRoundPen />
                  {t('office.orderDetail.reassign')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onCancel}>
                  <Ban />
                  {t('office.orderDetail.cancel')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      }
    />
  );
}
