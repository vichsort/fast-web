// Endereço com link para o mapa e botões de WhatsApp e telefone do cliente (03 e 04: o técnico chega e fala com
// o cliente direto do detalhe da O.S.).
import { MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { formatPhone, formatZipCode, mapsUrl, telUrl, whatsappUrl } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ToneBadge } from './badges';

/** Endereço estruturado (client_addresses). */
export interface AddressParts {
  label?: string | null;
  street: string;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city: string;
  state: string;
  zip_code?: string | null;
  reference?: string | null;
}

export interface AddressBlockProps extends React.ComponentProps<'div'> {
  /** Texto copiado na O.S. (03, R3) ou o endereço estruturado do cliente. */
  address: string | AddressParts;
  /** Esconde o botão do mapa. */
  hideMap?: boolean;
  /** Selo "Principal". */
  primary?: boolean;
  /** Selo "Excluído". */
  deleted?: boolean;
  /** Botão do mapa largo e alto (técnico, uso com luva/sol). */
  size?: 'default' | 'lg';
  /** Ações extras (editar, excluir, tornar principal). */
  actions?: React.ReactNode;
}

function partsToLine(a: AddressParts): string {
  return [
    [a.street, a.number, a.complement].filter(Boolean).join(', '),
    a.district,
    `${a.city}/${a.state}`,
    a.zip_code ? formatZipCode(a.zip_code) : null,
  ]
    .filter(Boolean)
    .join(' - ');
}

/** Bloco de endereço: apelido, linhas do endereço, referência e "Abrir no mapa". */
export function AddressBlock({
  address,
  hideMap,
  primary,
  deleted,
  size = 'default',
  actions,
  className,
  ...props
}: AddressBlockProps) {
  const structured = typeof address !== 'string';
  const query = structured ? partsToLine(address) : address;
  return (
    <div data-slot="address-block" className={cn('flex flex-col gap-3', deleted && 'opacity-70', className)} {...props}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <MapPin aria-hidden className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
          {structured ? (
            <>
              {(address.label || primary || deleted) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {address.label && <span className="font-semibold">{address.label}</span>}
                  {primary && <ToneBadge tone="brand" size="sm" label={t('ui.badge.primary')} />}
                  {deleted && <ToneBadge tone="muted" size="sm" label={t('ui.badge.deleted')} />}
                </div>
              )}
              <span className={cn(!address.label && 'font-medium')}>
                {[address.street, address.number, address.complement].filter(Boolean).join(', ')}
              </span>
              <span className="text-muted-foreground">
                {[address.district, `${address.city}/${address.state}`].filter(Boolean).join(' · ')}
                {address.zip_code && ` · ${formatZipCode(address.zip_code)}`}
              </span>
              {address.reference && (
                <span className="text-muted-foreground italic">
                  {t('ui.address.reference', { text: address.reference })}
                </span>
              )}
            </>
          ) : (
            <span className="font-medium text-pretty">{address}</span>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {!hideMap && (
        <Button
          variant="outline"
          size={size === 'lg' ? 'lg' : 'default'}
          className={cn(size === 'lg' && 'h-11 w-full text-base')}
          render={<a href={mapsUrl(query)} target="_blank" rel="noreferrer" />}
          nativeButton={false}
        >
          <Navigation />
          {t('ui.actions.openMap')}
        </Button>
      )}
    </div>
  );
}

export interface ContactActionsProps extends React.ComponentProps<'div'> {
  phone: string | null;
  /** Mensagem pronta do WhatsApp (ex.: t('ui.contact.whatsappMessage', {...})). */
  message?: string;
  /** Mostra o número formatado acima dos botões. */
  showNumber?: boolean;
  /** `lg`: botões altos que dividem a largura (técnico). */
  size?: 'default' | 'lg';
  /** Esconde "Ligar". */
  hideCall?: boolean;
}

/** Botões de WhatsApp (wa.me) e ligação. Sem telefone, não mostra nada. */
export function ContactActions({
  phone,
  message,
  showNumber,
  size = 'default',
  hideCall,
  className,
  ...props
}: ContactActionsProps) {
  if (!phone) return null;
  const lg = size === 'lg';
  return (
    <div data-slot="contact-actions" className={cn('flex flex-col gap-2', className)} {...props}>
      {showNumber && (
        <a href={telUrl(phone)} className="text-sm font-medium tabular-nums underline-offset-4 hover:underline">
          {formatPhone(phone)}
        </a>
      )}
      <div className="flex gap-2">
        <Button
          className={cn('tone-solid [--tone:var(--whatsapp)] hover:opacity-90', lg && 'h-11 flex-1 text-base')}
          size={lg ? 'lg' : 'default'}
          render={<a href={whatsappUrl(phone, message)} target="_blank" rel="noreferrer" />}
          nativeButton={false}
        >
          <MessageCircle />
          {t('ui.actions.whatsapp')}
        </Button>
        {!hideCall && (
          <Button
            variant="outline"
            size={lg ? 'lg' : 'default'}
            className={cn(lg && 'h-11 flex-1 text-base')}
            render={<a href={telUrl(phone)} />}
            nativeButton={false}
          >
            <Phone />
            {t('ui.actions.call')}
          </Button>
        )}
      </div>
    </div>
  );
}
