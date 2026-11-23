// Formulários de cliente: cadastro completo (painel lateral, com endereço opcional), cadastro rápido (só nome e
// telefone, do formulário da O.S.) e edição dos dados (02). React Hook Form + Zod, com o endereço de address-schema.ts.
import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormDialog, FormPanel } from '@/components/dialogs';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatPhone } from '@/lib/format';
import { requiredText } from '@/lib/forms';
import { t } from '@/lib/i18n';
import type { Client } from '@/lib/views';
import { createClient, updateClient } from '../api';
import { useOfficeAction } from '../session';
import { useCreateId, useStayOpen } from '../shared';
import { AddressFields } from './address-form';
import { type AddressDraft, addressSchema, draftToInput, emptyAddress } from './address-schema';

const clientSchema = z.object({
  name: requiredText(t('office.common.fieldRequired')),
  phone: z.string(),
  notes: z.string(),
});
type ClientValues = z.infer<typeof clientSchema>;

const emptyClient: ClientValues = { name: '', phone: '', notes: '' };

// O endereço só conta com "cadastrar endereço" marcado; os erros de cada campo dele aparecem no AddressFields.
const newClientSchema = clientSchema
  .extend({ withAddress: z.boolean(), address: z.custom<AddressDraft>() })
  .superRefine((value, ctx) => {
    if (value.withAddress && !addressSchema.safeParse(value.address).success) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: t('office.common.fieldRequired') });
    }
  });
type NewClientValues = z.infer<typeof newClientSchema>;

/** Nome, telefone e observações, ligados ao formulário de quem os usa (FormProvider). */
function ClientFields({ withNotes = true }: { withNotes?: boolean }) {
  const id = React.useId();
  const { register, setValue, formState } = useFormContext<ClientValues>();
  const nameError = formState.errors.name?.message;
  return (
    <FieldGroup className="gap-4">
      <Field data-invalid={Boolean(nameError) || undefined}>
        <FieldLabel htmlFor={`${id}-name`}>{t('office.clientForm.name')}</FieldLabel>
        <Input
          id={`${id}-name`}
          autoFocus
          placeholder={t('office.clientForm.namePlaceholder')}
          aria-invalid={Boolean(nameError) || undefined}
          {...register('name')}
        />
        {nameError && <FieldError>{nameError}</FieldError>}
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
          placeholder={t('office.clientForm.phonePlaceholder')}
          {...register('phone', {
            onBlur: (event: React.FocusEvent<HTMLInputElement>) =>
              event.target.value && setValue('phone', formatPhone(event.target.value)),
          })}
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
            placeholder={t('office.clientForm.notesPlaceholder')}
            {...register('notes')}
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
  const form = useForm<NewClientValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: { ...emptyClient, withAddress: false, address: emptyAddress },
  });
  const id = useCreateId(open);
  const { reset } = form;
  React.useEffect(() => {
    if (open) reset({ ...emptyClient, withAddress: false, address: emptyAddress });
  }, [open, reset]);
  const withAddress = form.watch('withAddress');

  const submit = form.handleSubmit(async ({ withAddress, address, ...client }) => {
    const result = await run(t('office.clientForm.create'), () =>
      createClient({ id, ...client, address: withAddress ? draftToInput(address) : null }),
    );
    if (result.ok) onCreated(result.value.client_id);
    else stayOpen();
  }, stayOpen);

  return (
    <FormPanel
      open={open}
      onOpenChange={handleOpenChange}
      title={t('office.clientForm.newTitle')}
      description={t('office.clientForm.newDescription')}
      submitLabel={t('office.clientForm.create')}
      size="lg"
      onSubmit={() => submit()}
    >
      <FormProvider {...form}>
        <div className="flex flex-col gap-5">
          <ClientFields />
          <Separator />
          {/* biome-ignore lint/a11y/noLabelWithoutControl: o Checkbox do Base UI é o controle dentro do label */}
          <label className="flex items-center gap-2 text-sm font-medium">
            <Controller
              control={form.control}
              name="withAddress"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
              )}
            />
            {t('office.clientForm.withAddress')}
          </label>
          {withAddress && (
            <Controller
              control={form.control}
              name="address"
              render={({ field }) => (
                <AddressFields value={field.value} onChange={field.onChange} showErrors={form.formState.isSubmitted} />
              )}
            />
          )}
        </div>
      </FormProvider>
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
  const form = useForm<ClientValues>({ resolver: zodResolver(clientSchema), defaultValues: emptyClient });
  const id = useCreateId(open);
  const { reset } = form;
  React.useEffect(() => {
    if (open) reset({ ...emptyClient, name: initialName });
  }, [open, initialName, reset]);

  const submit = form.handleSubmit(async ({ name, phone }) => {
    const result = await run(t('office.orderForm.quickClientAction'), () =>
      createClient({ id, name, phone, notes: null, address: null }),
    );
    if (result.ok) onCreated(result.value.client_id);
    else stayOpen();
  }, stayOpen);

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('office.orderForm.quickClientTitle')}
      description={t('office.orderForm.quickClientDescription')}
      submitLabel={t('office.orderForm.quickClientAction')}
      size="sm"
      onSubmit={() => submit()}
    >
      <FormProvider {...form}>
        <ClientFields withNotes={false} />
      </FormProvider>
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
  const form = useForm<ClientValues>({ resolver: zodResolver(clientSchema), defaultValues: emptyClient });
  const { reset } = form;
  React.useEffect(() => {
    if (!open) return;
    reset({ name: client.name, phone: client.phone ? formatPhone(client.phone) : '', notes: client.notes ?? '' });
  }, [open, client, reset]);

  const submit = form.handleSubmit(async (values) => {
    const result = await run(t('office.clientForm.editTitle'), () => updateClient(client.id, values));
    if (!result.ok) stayOpen();
  }, stayOpen);

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('office.clientForm.editTitle')}
      submitLabel={t('office.common.saveChanges')}
      onSubmit={() => submit()}
    >
      <FormProvider {...form}>
        <ClientFields />
      </FormProvider>
    </FormDialog>
  );
}
