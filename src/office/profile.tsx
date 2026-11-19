// Meu perfil (01: update direto de profiles, nome e telefone) e sair (logout real, apaga os dados do navegador).
import * as React from 'react';
import { useAuth } from '@/app/auth-context';
import { LogoutButton } from '@/app/logout-button';
import { RoleBadge } from '@/components/badges';
import { PageHeader } from '@/components/page-header';
import { DetailItem, DetailList, Section } from '@/components/section';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { UserAvatar } from '@/components/user';
import { formatPhone } from '@/lib/format';
import { t } from '@/lib/i18n';
import { updateProfile } from './api';
import { useOffice, useOfficeAction } from './session';

export function ProfilePage() {
  const { user, role, company } = useOffice();
  const { session } = useAuth();
  const run = useOfficeAction();
  const email = session?.user.email ?? '';
  const [name, setName] = React.useState(user.full_name);
  const [phone, setPhone] = React.useState(user.phone ? formatPhone(user.phone) : '');
  const [saving, setSaving] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const nameMissing = showErrors && !name.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setShowErrors(true);
    setSaving(true);
    await run(t('office.profile.saved'), () => updateProfile(user.id, { full_name: name, phone }));
    setSaving(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader size="lg" title={t('office.profile.title')} description={t('office.profile.description')} />
      <form onSubmit={submit} noValidate>
        <Section
          title={t('office.profile.sectionData')}
          footer={
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Spinner aria-hidden />}
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
              <Field data-invalid={nameMissing || undefined}>
                <FieldLabel htmlFor="profile-name">{t('office.profile.name')}</FieldLabel>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={nameMissing || undefined}
                />
                {nameMissing && <FieldError>{t('office.common.fieldRequired')}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-phone">{t('office.profile.phone')}</FieldLabel>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => phone && setPhone(formatPhone(phone))}
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
          <div>
            <LogoutButton userId={session.user.id} />
          </div>
        )}
      </Section>
    </div>
  );
}
