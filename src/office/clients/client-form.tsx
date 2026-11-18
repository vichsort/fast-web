// Formulários de cliente: cadastro completo (painel lateral, com endereço opcional), cadastro rápido (só nome e
// telefone, do formulário da O.S.) e edição dos dados (02).
import * as React from 'react';
import { FormDialog, FormPanel } from '@/components/dialogs';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatPhone } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { Client } from '@/mocks';
import { createClient, updateClient } from '../mocks';
import { useOfficeAction } from '../session';
import { useStayOpen } from '../shared';
import { AddressFields, addressValid, draftToInput, emptyAddress } from './address-form';

interface ClientDraft {
  name: string;
  phone: string;
  notes: string;
}

function ClientFields({
  value,
  onChange,
  showErrors,
  withNotes = true,
}: {
  value: ClientDraft;
  onChange: (next: ClientDraft) => void;
  showErrors: boolean;
  withNotes?: boolean;
}) {
  const id = React.useId();
  const nameMissing = showErrors && !value.name.trim();
  return (
    <FieldGroup className="gap-4">
      <Field data-invalid={nameMissing || undefined}>
        <FieldLabel htmlFor={`${id}-name`}>{t('office.clientForm.name')}</FieldLabel>
        <Input
          id={`${id}-name`}
          autoFocus
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder={t('office.clientForm.namePlaceholder')}
          aria-invalid={nameMissing || undefined}
        />
        {nameMissing && <FieldError>{t('office.common.fieldRequired')}</FieldError>}
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-phone`}>
          {t('office.clientForm.phone')}{' '}
          <span className="font-normal text-muted-foreground">{t('office.common.optional')}</span>
        </FieldLabel>
        <Input
          id={`${id}-phone`}
          type="tel"
          inputMode="tel"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
          onBlur={() => value.phone && onChange({ ...value, phone: formatPhone(value.phone) })}
          placeholder={t('office.clientForm.phonePlaceholder')}
        />
      </Field>
      {withNotes && (
        <Field>
          <FieldLabel htmlFor={`${id}-notes`}>
            {t('office.clientForm.notes')}{' '}
            <span className="font-normal text-muted-foreground">{t('office.common.optional')}</span>
          </FieldLabel>
          <Textarea
            id={`${id}-notes`}
            rows={3}
            value={value.notes}
            onChange={(event) => onChange({ ...value, notes: event.target.value })}
            placeholder={t('office.clientForm.notesPlaceholder')}
          />
        </Field>
      )}
    </FieldGroup>
  );
}

/** Cadastro completo, no painel lateral da lista de clientes. */
export function NewClientPanel({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (clientId: string) => void;
}) {
  const run = useOfficeAction();
  const [handleOpenChange, stayOpen] = useStayOpen(onOpenChange);
  const [draft, setDraft] = React.useState<ClientDraft>({ name: '', phone: '', notes: '' });
  const [withAddress, setWithAddress] = React.useState(false);
  const [address, setAddress] = React.useState(emptyAddress);
  const [showErrors, setShowErrors] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setDraft({ name: '', phone: '', notes: '' });
    setWithAddress(false);
    setAddress(emptyAddress);
    setShowErrors(false);
  }, [open]);

  async function submit() {
    if (!draft.name.trim() || (withAddress && !addressValid(address))) {
      setShowErrors(true);
      return stayOpen();
    }
    const id = crypto.randomUUID();
    const result = await run(t('office.clientForm.create'), () =>
      createClient({ id, ...draft, address: withAddress ? draftToInput(address) : null }),
    );
    if (result.ok) onCreated(result.value.client_id);
    else stayOpen();
  }

  return (
    <FormPanel
      open={open}
      onOpenChange={handleOpenChange}
      title={t('office.clientForm.newTitle')}
      description={t('office.clientForm.newDescription')}
      submitLabel={t('office.clientForm.create')}
      size="lg"
      onSubmit={submit}
    >
      <div className="flex flex-col gap-5">
        <ClientFields value={draft} onChange={setDraft} showErrors={showErrors} />
        <Separator />
        {/* biome-ignore lint/a11y/noLabelWithoutControl: o Checkbox do Base UI é o controle dentro do label */}
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={withAddress} onCheckedChange={(checked) => setWithAddress(checked === true)} />
          {t('office.clientForm.withAddress')}
        </label>
        {withAddress && <AddressFields value={address} onChange={setAddress} showErrors={showErrors} />}
      </div>
    </FormPanel>
  );
}

/** Cadastro rápido no formulário da O.S. (02: só nome e telefone, sem endereço). */
export function QuickClientDialog({
  open,
  onOpenChange,
  initialName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  onCreated: (clientId: string) => void;
}) {
  const run = useOfficeAction();
  const [handleOpenChange, stayOpen] = useStayOpen(onOpenChange);
  const [draft, setDraft] = React.useState<ClientDraft>({ name: '', phone: '', notes: '' });
  const [showErrors, setShowErrors] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setDraft({ name: initialName, phone: '', notes: '' });
    setShowErrors(false);
  }, [open, initialName]);

  async function submit() {
    if (!draft.name.trim()) {
      setShowErrors(true);
      return stayOpen();
    }
    const id = crypto.randomUUID();
    const result = await run(t('office.orderForm.quickClientAction'), () =>
      createClient({ id, name: draft.name, phone: draft.phone, notes: null, address: null }),
    );
    if (result.ok) onCreated(result.value.client_id);
    else stayOpen();
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('office.orderForm.quickClientTitle')}
      description={t('office.orderForm.quickClientDescription')}
      submitLabel={t('office.orderForm.quickClientAction')}
      size="sm"
      onSubmit={submit}
    >
      <ClientFields value={draft} onChange={setDraft} showErrors={showErrors} withNotes={false} />
    </FormDialog>
  );
}

/** Edição dos dados do cliente (update direto de nome, telefone e observações). */
export function EditClientDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}) {
  const run = useOfficeAction();
  const [handleOpenChange, stayOpen] = useStayOpen(onOpenChange);
  const [draft, setDraft] = React.useState<ClientDraft>({ name: '', phone: '', notes: '' });
  const [showErrors, setShowErrors] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setDraft({ name: client.name, phone: client.phone ? formatPhone(client.phone) : '', notes: client.notes ?? '' });
    setShowErrors(false);
  }, [open, client]);

  async function submit() {
    if (!draft.name.trim()) {
      setShowErrors(true);
      return stayOpen();
    }
    const result = await run(t('office.clientForm.editTitle'), () => updateClient(client.id, draft));
    if (!result.ok) stayOpen();
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('office.clientForm.editTitle')}
      submitLabel={t('office.common.saveChanges')}
      onSubmit={submit}
    >
      <ClientFields value={draft} onChange={setDraft} showErrors={showErrors} />
    </FormDialog>
  );
}
