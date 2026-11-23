// Cliente e local da O.S.: link para o cliente, WhatsApp e ligar, endereço com o mapa (02, 03).
import { Link } from '@tanstack/react-router';
import { AddressBlock, ContactActions } from '@/components/address-block';
import { ToneBadge } from '@/components/badges';
import { Section } from '@/components/section';
import { formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { OrderDetail } from '@/lib/views';
import { useOffice } from '../../session';
import { textLink } from '../../shared';

export function ClientSection({ order: o }: { order: OrderDetail }) {
  const { company } = useOffice();
  const number = formatOrderNumber(o.order_number);
  return (
    <Section title={t('office.orderDetail.sectionClient')}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/office/clients/$clientId" params={{ clientId: o.client_id }} className={textLink}>
            {o.client.name}
          </Link>
          {o.client.deleted_at && <ToneBadge tone="muted" size="sm" label={t('office.orderDetail.clientDeleted')} />}
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
  );
}
