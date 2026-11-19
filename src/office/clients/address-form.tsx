// Campos de endereço (02: formato de endereço) com o preenchimento pelo CEP (ViaCEP; tabela de exemplo com os dados
// de exemplo), e o diálogo de adicionar ou editar endereço do cliente.
import { CircleCheck, Search, TriangleExclamationPoint } from 'lucide-react';
import * as React from 'react';
import { FormDialog } from '@/components/dialogs';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { formatZipCode } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { ClientAddress } from '@/lib/views';
import { type AddressInput, addAddress, lookupZip, updateAddress } from '../api';
import { useOfficeAction } from '../session';
import { useCreateId, useStayOpen } from '../shared';

export type AddressDraft = Record<keyof AddressInput, string>;

export const emptyAddress: AddressDraft = {
  label: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  reference: '',
};

export const draftFromAddress = (a: ClientAddress): AddressDraft => ({
  label: a.label ?? '',
  zip_code: a.zip_code ? formatZipCode(a.zip_code) : '',
  street: a.street,
  number: a.number ?? '',
  complement: a.complement ?? '',
  district: a.district ?? '',
  city: a.city,
  state: a.state,
  reference: a.reference ?? '',
});

export const draftToInput = (d: AddressDraft): AddressInput => ({
  label: d.label || null,
  zip_code: d.zip_code || null,
  street: d.street,
  number: d.number || null,
  complement: d.complement || null,
  district: d.district || null,
  city: d.city,
  state: d.state,
  reference: d.reference || null,
});

/** 02, R2: rua, cidade e UF. */
export const addressValid = (d: AddressDraft) => Boolean(d.street.trim() && d.city.trim() && d.state.trim());

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

const maskZip = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

type ZipState = 'idle' | 'searching' | 'found' | 'not_found' | 'unavailable';

export function AddressFields({
  value,
  onChange,
  showErrors,
}: {
  value: AddressDraft;
  onChange: (next: AddressDraft) => void;
  /** Mostra os obrigatórios vazios (depois de tentar salvar). */
  showErrors?: boolean;
}) {
  const id = React.useId();
  const [zip, setZip] = React.useState<ZipState>('idle');
  // A busca é assíncrona: aplica só a resposta do último CEP digitado, sobre os campos como estão quando ela chega.
  const latest = React.useRef(value);
  latest.current = value;
  const search = React.useRef(0);
  const set = (key: keyof AddressDraft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: event.target.value });

  async function changeZip(raw: string) {
    const masked = maskZip(raw);
    onChange({ ...value, zip_code: masked });
    const current = ++search.current;
    const digits = masked.replace(/\D/g, '');
    if (digits.length !== 8) return setZip('idle');
    setZip('searching');
    const result = await lookupZip(digits);
    if (current !== search.current) return;
    setZip(result.kind);
    if (result.kind === 'found') onChange({ ...latest.current, ...result.address });
  }

  const missing = (key: 'street' | 'city' | 'state') => showErrors && !value[key].trim();
  return (
    <FieldGroup className="gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field>
          <FieldLabel htmlFor={`${id}-label`}>
            {t('office.address.label')}{' '}
            <span className="font-normal text-muted-foreground">{t('office.common.optional')}</span>
          </FieldLabel>
          <Input
            id={`${id}-label`}
            value={value.label}
            onChange={set('label')}
            placeholder={t('office.address.labelPlaceholder')}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-zip`}>{t('office.address.zip')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={`${id}-zip`}
              inputMode="numeric"
              value={value.zip_code}
              onChange={(event) => void changeZip(event.target.value)}
              placeholder={t('office.address.zipPlaceholder')}
            />
            <InputGroupAddon align="inline-end">
              {zip === 'searching' ? <Spinner aria-label={t('office.address.zipSearching')} /> : <Search aria-hidden />}
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </div>
      <p className="-mt-2 flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        {zip === 'found' && <CircleCheck aria-hidden className="size-3.5 text-(--tone-success)" />}
        {(zip === 'not_found' || zip === 'unavailable') && (
          <TriangleExclamationPoint aria-hidden className="size-3.5 text-(--tone-warning)" />
        )}
        {zip === 'searching'
          ? t('office.address.zipSearching')
          : zip === 'found'
            ? t('office.address.zipFound')
            : zip === 'not_found'
              ? t('office.address.zipNotFound')
              : zip === 'unavailable'
                ? t('office.address.zipUnavailable')
                : t('office.address.zipHint')}
      </p>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <Field data-invalid={missing('street') || undefined}>
          <FieldLabel htmlFor={`${id}-street`}>{t('office.address.street')}</FieldLabel>
          <Input
            id={`${id}-street`}
            value={value.street}
            onChange={set('street')}
            aria-invalid={missing('street') || undefined}
          />
          {missing('street') && <FieldError>{t('office.common.fieldRequired')}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-number`}>{t('office.address.number')}</FieldLabel>
          <Input id={`${id}-number`} value={value.number} onChange={set('number')} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-complement`}>{t('office.address.complement')}</FieldLabel>
          <Input id={`${id}-complement`} value={value.complement} onChange={set('complement')} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-district`}>{t('office.address.district')}</FieldLabel>
          <Input id={`${id}-district`} value={value.district} onChange={set('district')} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <Field data-invalid={missing('city') || undefined}>
          <FieldLabel htmlFor={`${id}-city`}>{t('office.address.city')}</FieldLabel>
          <Input
            id={`${id}-city`}
            value={value.city}
            onChange={set('city')}
            aria-invalid={missing('city') || undefined}
          />
          {missing('city') && <FieldError>{t('office.common.fieldRequired')}</FieldError>}
        </Field>
        <Field data-invalid={missing('state') || undefined}>
          <FieldLabel htmlFor={`${id}-state`}>{t('office.address.state')}</FieldLabel>
          <NativeSelect
            id={`${id}-state`}
            value={value.state}
            onChange={set('state')}
            className="w-full"
            aria-invalid={missing('state') || undefined}
          >
            <NativeSelectOption value="">—</NativeSelectOption>
            {UFS.map((uf) => (
              <NativeSelectOption key={uf} value={uf}>
                {uf}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {missing('state') && <FieldError>{t('office.common.fieldRequired')}</FieldError>}
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${id}-reference`}>{t('office.address.reference')}</FieldLabel>
        <Input
          id={`${id}-reference`}
          value={value.reference}
          onChange={set('reference')}
          placeholder={t('office.address.referencePlaceholder')}
        />
        <FieldDescription>{t('office.address.requiredHint')}</FieldDescription>
      </Field>
    </FieldGroup>
  );
}

/** Adicionar (sem `address`) ou editar um endereço do cliente. Devolve o id do endereço em `onSaved`. */
export function AddressDialog({
  open,
  onOpenChange,
  clientId,
  address,
  canBePrimary = true,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  address?: ClientAddress;
  /** Mostra "usar como principal" (só ao adicionar). */
  canBePrimary?: boolean;
  onSaved?: (addressId: string) => void;
}) {
  const run = useOfficeAction();
  const [handleOpenChange, stayOpen] = useStayOpen(onOpenChange);
  const [draft, setDraft] = React.useState<AddressDraft>(emptyAddress);
  const [primary, setPrimary] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const createId = useCreateId(open);
  React.useEffect(() => {
    if (!open) return;
    setDraft(address ? draftFromAddress(address) : emptyAddress);
    setPrimary(false);
    setShowErrors(false);
  }, [open, address]);

  async function submit() {
    if (!addressValid(draft)) {
      setShowErrors(true);
      return stayOpen();
    }
    const result = address
      ? await run(t('office.address.editTitle'), () =>
          updateAddress(address.id, draftToInput(draft)).then(() => address.id),
        )
      : await run(t('office.address.addTitle'), () =>
          addAddress({ id: createId, clientId }, draftToInput(draft), primary),
        );
    if (result.ok) onSaved?.(result.value);
    else stayOpen();
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t(address ? 'office.address.editTitle' : 'office.address.addTitle')}
      size="lg"
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        <AddressFields value={draft} onChange={setDraft} showErrors={showErrors} />
        {!address && canBePrimary && (
          // biome-ignore lint/a11y/noLabelWithoutControl: o Checkbox do Base UI é o controle dentro do label
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={primary} onCheckedChange={(checked) => setPrimary(checked === true)} />
            {t('office.address.makePrimary')}
          </label>
        )}
      </div>
    </FormDialog>
  );
}
