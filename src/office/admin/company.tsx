// Empresa (owner): dados cadastrais e fuso (01: update direto de companies; o trigger grava a auditoria).
// React Hook Form + Zod: só o nome é obrigatório.
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { ScrollText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { DetailItem, DetailList, Section } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatOrderNumber, formatPhone } from '@/lib/format';
import { requiredText } from '@/lib/forms';
import { t } from '@/lib/i18n';
import { ptBR } from '@/lib/i18n/pt-BR';
import { phoneDigitsOrNull, SHORT_TEXT_MAX } from '@/lib/input';
import { updateCompany } from '../api';
import { useOffice, useOfficeAction } from '../session';
import { OwnerOnly } from '../shared';

const TIMEZONES = Object.keys(ptBR.office.company.timezones) as (keyof typeof ptBR.office.company.timezones)[];

export function CompanyPage() {
  return (
    <OwnerOnly>
      <CompanyForm />
    </OwnerOnly>
  );
}

const companySchema = z.object({
  name: requiredText(t('office.common.fieldRequired')),
  document: z.string(),
  phone: z.string(),
  email: z.string(),
  timezone: z.string(),
});

/** A empresa vem da sessão do escritório (o layout recarrega depois de salvar). */
function CompanyForm() {
  const { actor, timeZone, company } = useOffice();
  const run = useOfficeAction();
  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name,
      document: company.document ?? '',
      phone: company.phone ? formatPhone(company.phone) : '',
      email: company.email ?? '',
      timezone: company.timezone,
    },
  });
  const { register } = form;
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    await run(t('office.company.saved'), () =>
      updateCompany({ ...values, phone: phoneDigitsOrNull(values.phone) }, actor),
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        size="lg"
        title={t('office.company.title')}
        description={t('office.company.description')}
        actions={
          <Button variant="outline" render={<Link to="/office/audit" />} nativeButton={false}>
            <ScrollText />
            {t('office.nav.audit')}
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={submit} noValidate>
          <Section
            title={t('office.company.sectionData')}
            footer={
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner aria-hidden />}
                  {t('office.common.saveChanges')}
                </Button>
              </div>
            }
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(errors.name) || undefined}>
                <FieldLabel htmlFor="company-name">{t('office.company.name')}</FieldLabel>
                <Input
                  id="company-name"
                  maxLength={SHORT_TEXT_MAX}
                  aria-invalid={Boolean(errors.name) || undefined}
                  {...register('name')}
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="company-document">{t('office.company.document')}</FieldLabel>
                  <Input id="company-document" maxLength={SHORT_TEXT_MAX} {...register('document')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="company-phone">{t('office.company.phone')}</FieldLabel>
                  <Input id="company-phone" maxLength={SHORT_TEXT_MAX} type="tel" {...register('phone')} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="company-email">{t('office.company.email')}</FieldLabel>
                <Input id="company-email" maxLength={SHORT_TEXT_MAX} type="email" {...register('email')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="company-timezone">{t('office.company.timezone')}</FieldLabel>
                <NativeSelect id="company-timezone" className="w-full" {...register('timezone')}>
                  {TIMEZONES.map((tz) => (
                    <NativeSelectOption key={tz} value={tz}>
                      {t(`office.company.timezones.${tz}`)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>{t('office.company.timezoneHint')}</FieldDescription>
              </Field>
            </FieldGroup>
          </Section>
        </form>
        <Section title={t('office.company.sectionNumbering')} variant="muted" className="self-start">
          <DetailList columns={1}>
            <DetailItem label={t('office.company.nextNumber')}>
              <span className="font-heading text-2xl font-semibold tabular-nums">
                {formatOrderNumber(company.next_order_number)}
              </span>
            </DetailItem>
            <DetailItem label={t('office.company.since')}>{formatDate(company.created_at, timeZone)}</DetailItem>
          </DetailList>
          <p className="text-xs text-muted-foreground">{t('office.company.nextNumberHint')}</p>
        </Section>
      </div>
    </div>
  );
}
