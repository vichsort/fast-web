// Meu perfil (01: update direto de profiles, nome e telefone), trocar a senha e sair (logout real, apaga os dados do
// navegador).
// React Hook Form + Zod: só o nome é obrigatório.
import { zodResolver } from '@hookform/resolvers/zod';
import type * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/app/auth-context';
import { ChangePasswordButton } from '@/app/change-password-dialog';
import { LogoutButton } from '@/app/logout-button';
import { AppVersion } from '@/components/app-version';
import { RoleBadge } from '@/components/badges';
import { PageHeader } from '@/components/page-header';
import { DetailItem, DetailList, Section } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { UserAvatar } from '@/components/user';
import { formatPhone } from '@/lib/format';
import { requiredText } from '@/lib/forms';
import { t } from '@/lib/i18n';
import { SHORT_TEXT_MAX } from '@/lib/input';
import { updateProfile } from './api';
import { useOffice, useOfficeAction } from './session';

const profileSchema = z.object({ name: requiredText(t('office.common.fieldRequired')), phone: z.string() });

export function ProfilePage() {
  const { user, role, company } = useOffice();
  const { session } = useAuth();
  const run = useOfficeAction();
  const email = session?.user.email ?? '';
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.full_name, phone: user.phone ? formatPhone(user.phone) : '' },
  });
  const { register, setValue } = form;
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ name, phone }) => {
    await run(t('office.profile.saved'), () => updateProfile(user.id, { full_name: name, phone }));
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader size="lg" title={t('office.profile.title')} description={t('office.profile.description')} />
      <form onSubmit={submit} noValidate>
        <Section
          title={t('office.profile.sectionData')}
          footer={
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner aria-hidden />}
                {t('office.common.saveChanges')}
              </Button>
            </div>
          }
        >
          <div className="flex items-center gap-4">
            <UserAvatar name={user.full_name} seed={user.id} size="lg" />
            <div className="flex flex-col gap-1">
              <span className="font-heading text-lg font-semibold">{user.full_name}</span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <RoleBadge role={role} size="sm" />
                {company.name}
              </span>
            </div>
          </div>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.name) || undefined}>
                <FieldLabel htmlFor="profile-name">{t('office.profile.name')}</FieldLabel>
                <Input
                  id="profile-name"
                  maxLength={SHORT_TEXT_MAX}
                  aria-invalid={Boolean(errors.name) || undefined}
                  {...register('name')}
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-phone">{t('office.profile.phone')}</FieldLabel>
                <Input
                  id="profile-phone"
                  maxLength={SHORT_TEXT_MAX}
                  type="tel"
                  {...register('phone', {
                    onBlur: (event: React.FocusEvent<HTMLInputElement>) =>
                      event.target.value && setValue('phone', formatPhone(event.target.value)),
                  })}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="profile-email">{t('office.profile.email')}</FieldLabel>
              <Input id="profile-email" value={email} readOnly disabled />
              <FieldDescription>{t('office.profile.emailHint')}</FieldDescription>
            </Field>
          </FieldGroup>
        </Section>
      </form>
      <Section title={t('office.profile.sectionSession')} description={t('office.profile.sessionDescription')}>
        <DetailList columns={2}>
          <DetailItem label={t('office.profile.role')}>{t(`ui.role.${role}`)}</DetailItem>
          <DetailItem label={t('office.profile.company')}>{company.name}</DetailItem>
        </DetailList>
        {session && (
          <div className="flex flex-wrap gap-2">
            {email && <ChangePasswordButton email={email} />}
            <LogoutButton userId={session.user.id} />
          </div>
        )}
      </Section>
      <AppVersion />
    </div>
  );
}
