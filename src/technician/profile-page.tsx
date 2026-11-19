import { useNavigate } from '@tanstack/react-router';
import { FlaskConical, LogOut, Save, WifiOff } from 'lucide-react';
import * as React from 'react';
import { useAuth } from '@/app/auth-context';
import { signOutAndWipe } from '@/app/session';
import { RoleBadge } from '@/components/badges';
import { ConfirmDialog } from '@/components/dialogs';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { LoadingDetail } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/user';
import { formatPhone } from '@/lib/format';
import { t } from '@/lib/i18n';
import { act, useOffline } from './act';
import { saveProfile, usePendingItems, useSimulatedOffline, useTechSession } from './api';

/** Meu perfil: nome e telefone (01, update direto do próprio perfil, só com sinal) e sair (docs/screens-technician.md). */
export function ProfilePage() {
  const query = useTechSession();
  if (!query.data) return <LoadingDetail />;
  return <Profile key={query.data.profile.full_name} data={query.data} />;
}

function Profile({ data }: { data: NonNullable<ReturnType<typeof useTechSession>['data']> }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const simulated = useSimulatedOffline();
  const offline = useOffline();
  const pending = usePendingItems().data?.length ?? 0;
  const [name, setName] = React.useState(data.profile.full_name);
  const [phone, setPhone] = React.useState(formatPhone(data.profile.phone));
  const [touched, setTouched] = React.useState(false);
  const [logout, setLogout] = React.useState(false);
  const nameInvalid = name.trim() === '';
  const ids = { name: React.useId(), phone: React.useId(), offline: React.useId() };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('technician.profile.title')} />

      <div className="flex items-center gap-4">
        <UserAvatar name={data.profile.full_name} seed={data.profile.id} size="lg" className="size-16 text-xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-heading text-lg font-semibold">{data.profile.full_name}</span>
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <RoleBadge role={data.role} size="sm" />
            {data.company.name}
          </span>
          {session?.user.email && (
            <span className="truncate text-xs text-muted-foreground">
              {t('technician.profile.signedInAs', { email: session.user.email })}
            </span>
          )}
        </div>
      </div>

      <Section density="touch">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (nameInvalid) return;
            void act(
              saveProfile({ full_name: name.trim(), phone: phone.replace(/\D/g, '') || null }),
              t('technician.profile.save'),
            );
          }}
        >
          <FieldGroup>
            <Field data-invalid={touched && nameInvalid}>
              <FieldLabel htmlFor={ids.name}>{t('technician.profile.name')}</FieldLabel>
              <Input
                id={ids.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && nameInvalid}
                autoComplete="name"
                className="h-12 text-base"
              />
              {touched && nameInvalid && <FieldError>{t('technician.profile.nameRequired')}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.phone}>{t('technician.profile.phone')}</FieldLabel>
              <Input
                id={ids.phone}
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setPhone(formatPhone(phone))}
                placeholder={t('technician.profile.phonePlaceholder')}
                autoComplete="tel"
                className="h-12 text-base"
              />
              <FieldDescription>{t('technician.profile.phoneHint')}</FieldDescription>
            </Field>
          </FieldGroup>
          {offline && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <WifiOff aria-hidden className="size-4" />
              {t('technician.profile.onlineOnly')}
            </p>
          )}
          <Button type="submit" className="h-12 text-base" disabled={offline}>
            <Save className="size-5" />
            {t('technician.profile.save')}
          </Button>
        </form>
      </Section>

      {simulated && (
        <Section variant="muted" density="touch" icon={FlaskConical} title={t('technician.profile.scratchTitle')}>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor={ids.offline} className="flex flex-col gap-0.5">
              <span className="text-base font-medium">{t('technician.profile.scratchOffline')}</span>
              <span className="text-sm text-muted-foreground">{t('technician.profile.scratchOfflineHint')}</span>
            </label>
            <Switch id={ids.offline} checked={simulated.offline} onCheckedChange={(v) => simulated.setOffline(v)} />
          </div>
        </Section>
      )}

      <Button variant="destructive" className="h-12 text-base" onClick={() => setLogout(true)}>
        <LogOut className="size-5" />
        {t('technician.profile.logout')}
      </Button>

      <ConfirmDialog
        open={logout}
        onOpenChange={setLogout}
        tone="destructive"
        title={t('technician.profile.logoutTitle')}
        description={
          pending > 0
            ? t('technician.profile.logoutPendingDescription', { count: pending })
            : t('technician.profile.logoutDescription')
        }
        confirmLabel={t('technician.profile.logoutConfirm')}
        onConfirm={async () => {
          // Sair é real (a sessão do login); a contagem acima é a dos dados de exemplo.
          if (session) await signOutAndWipe(session.user.id);
          await navigate({ to: '/login' });
        }}
      />
    </div>
  );
}
