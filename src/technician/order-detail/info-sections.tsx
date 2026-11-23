// Seções de leitura do detalhe da O.S. do técnico: instruções, local (prévia de mapa) e cliente (WhatsApp e ligar).
import { ClipboardList, MapPin, UserRound } from 'lucide-react';
import { AddressBlock, ContactActions } from '@/components/address-block';
import { Section } from '@/components/section';
import { formatOrderNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { type TechOrder, useTechSession } from '../api';
import { MapPreview } from '../parts';

export function InstructionsSection({ order }: { order: TechOrder }) {
  return (
    <Section title={t('technician.detail.instructions')} icon={ClipboardList} density="touch">
      {order.instructions ? (
        <p className="text-base leading-relaxed whitespace-pre-line">{order.instructions}</p>
      ) : (
        <p className="text-muted-foreground italic">{t('technician.detail.noInstructions')}</p>
      )}
    </Section>
  );
}

export function AddressSection({ order }: { order: TechOrder }) {
  return (
    <Section title={t('technician.detail.address')} icon={MapPin} density="touch">
      {order.address ? (
        <>
          <MapPreview address={order.address} />
          <AddressBlock address={order.address} hideMap size="lg" />
        </>
      ) : (
        <p className="text-muted-foreground">{t('technician.detail.noAddress')}</p>
      )}
    </Section>
  );
}

export function ClientSection({ order }: { order: TechOrder }) {
  const company = useTechSession().data?.company.name;
  const whatsapp = t('ui.contact.whatsappMessage', {
    name: order.client.name,
    company: company ?? '',
    number: formatOrderNumber(order.order_number),
  });
  return (
    <Section title={t('technician.detail.client')} icon={UserRound} density="touch">
      <p className="text-base font-semibold">{order.client.name}</p>
      {order.client.phone ? (
        <ContactActions phone={order.client.phone} message={whatsapp} showNumber size="lg" />
      ) : (
        <p className="text-muted-foreground">{t('technician.detail.noPhone')}</p>
      )}
    </Section>
  );
}
