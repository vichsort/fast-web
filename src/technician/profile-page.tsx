import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { FlaskConical, ListTodo, LogOut, Save, WifiOff } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/app/auth-context';
import { signOutAndWipe } from '@/app/session';
import { AppVersion } from '@/components/app-version';
import { RoleBadge } from '@/components/badges';
import { ConfirmDialog } from '@/components/dialogs';
import { PageHeader } from '@/components/page-header';
import { Section } from '@/components/section';
import { LoadingDetail } from '@/components/states';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/user';
import { formatPhone } from '@/lib/format';
import { requiredText } from '@/lib/forms';
import { t } from '@/lib/i18n';
import { phoneDigitsOrNull, SHORT_TEXT_MAX } from '@/lib/input';
import { act, useOffline } from './act';
import { saveProfile, usePendingItems, useSimulatedOffline, useTechSession } from './api';
import { pendingOrderCounts } from './derive';

/** Nome obrigatório (React Hook Form + Zod); o erro aparece ao sair do campo ou ao salvar. */
const profileSchema = z.object({ name: requiredText(t('technician.profile.nameRequired')), phone: z.string() });

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
  const pending = pendingOrderCounts(usePendingItems().data ?? []).total;
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: { name: data.profile.full_name, phone: formatPhone(data.profile.phone) },
  });
  const { register, setValue } = form;
  const nameError = form.formState.errors.name?.message;
  const [logout, setLogout] = React.useState(false);
  const ids = { name: React.useId(), phone: React.useId(), offline: React.useId() };
  async function wipe() {
    // Sair é real (a sessão do login); a contagem de pendências é a dos dados de exemplo no modo de exemplo.
    if (session) await signOutAndWipe(session.user.id);
    await navigate({ to: '/login' });
  }

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
          onSubmit={form.handleSubmit(({ name, phone }) => {
            void act(
              saveProfile({ full_name: name.trim(), phone: phoneDigitsOrNull(phone) }),
              t('technician.profile.save'),
            );
          })}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor={ids.name}>{t('technician.profile.name')}</FieldLabel>
              <Input
                id={ids.name}
                maxLength={SHORT_TEXT_MAX}
                aria-invalid={Boolean(nameError)}
                autoComplete="name"
                className="h-12 text-base"
                {...register('name')}
              />
              {nameError && <FieldError>{nameError}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.phone}>{t('technician.profile.phone')}</FieldLabel>
              <Input
                id={ids.phone}
                maxLength={SHORT_TEXT_MAX}
                type="tel"
                inputMode="tel"
                placeholder={t('technician.profile.phonePlaceholder')}
                autoComplete="tel"
                className="h-12 text-base"
                {...register('phone', {
                  onBlur: (event: React.FocusEvent<HTMLInputElement>) =>
                    setValue('phone', formatPhone(event.target.value)),
                })}
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

      {pending > 0 ? (
        <AlertDialog open={logout} onOpenChange={setLogout}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('technician.profile.logoutTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('technician.profile.logoutPendingDescription', { count: pending })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {/* Com pendências, o caminho seguro vem primeiro; apagar fica por último, longe do toque rápido. */}
            <div className="flex flex-col gap-2">
              <Button className="h-11" onClick={() => void navigate({ to: '/technician/pending' })}>
                <ListTodo />
                {t('technician.profile.logoutSeePending')}
              </Button>
              <AlertDialogCancel className="h-11">{t('ui.actions.cancel')}</AlertDialogCancel>
              <Button variant="ghost" className="mt-2 h-11 text-destructive" onClick={() => void wipe()}>
                <LogOut />
                {t('technician.profile.logoutWipe')}
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <ConfirmDialog
          open={logout}
          onOpenChange={setLogout}
          tone="destructive"
          title={t('technician.profile.logoutTitle')}
          description={t('technician.profile.logoutDescription')}
          confirmLabel={t('technician.profile.logoutConfirm')}
          onConfirm={wipe}
        />
      )}
      <AppVersion />
    </div>
  );
}
