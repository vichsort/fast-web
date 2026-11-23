// Dados do cliente: telefone com WhatsApp e ligar, observações e cliente desde (02).
import { ContactActions } from '@/components/address-block';
import { DetailItem, DetailList, Section } from '@/components/section';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useOffice } from '../../session';
import type { ClientWithOpenOrders } from './client';

export function ClientDataSection({ client: c }: { client: ClientWithOpenOrders }) {
  const { timeZone } = useOffice();
  return (
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
  );
}
