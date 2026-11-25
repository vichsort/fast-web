// Link do convite e de "definir senha" (06 do backend, R12 a R14): o owner manda `<app>/link#<token>`. O token sai da
// URL ao abrir (não fica no histórico). Recuperação e convite de conta nova definem a senha aqui e entram; convite de
// conta que já tem senha vai ao login, e o convite aparece depois da entrada (gate.tsx).
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { actionErrorCode } from '@/lib/errors';
import { errorMessage, t } from '@/lib/i18n';
import { linkToken } from '@/lib/member-link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../auth-context';
import { type LinkInfo, openLink, redeemLink } from '../links';
import { LogoutButton } from '../logout-button';
import { AuthCard } from './auth-card';

/** Mínimo do Auth (minimum_password_length); o backend confere de novo (invalid_input). */
const MIN_PASSWORD = 6;

const schema = z
  .object({
    password: z.string().min(MIN_PASSWORD, t('auth.passwordTooShort', { min: MIN_PASSWORD })),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: t('auth.passwordsDiffer') });

export function LinkPage() {
  const { session, ready } = useAuth();
  const [token] = useState(() => linkToken(window.location.hash));
  const [used, setUsed] = useState(false);

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  const info = useQuery({
    queryKey: ['link', token],
    enabled: Boolean(token) && !used,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: () => openLink(token as string),
  });

  if (!token || used) return <Invalid />;
  if (!ready) return <Loading />;
  // Outra conta aberta neste aparelho: o link entraria com a conta do link por cima dela.
  if (session) {
    return (
      <AuthCard
        title={t('auth.link.signedInTitle')}
        description={t('auth.link.signedIn', { email: session.user.email ?? '' })}
      >
        <div className="flex justify-center">
          <LogoutButton userId={session.user.id} label={t('auth.link.signOutAndContinue')} onSignedOut={() => {}} />
        </div>
      </AuthCard>
    );
  }
  if (info.isPending) return <Loading />;
  if (info.isError) {
    const code = actionErrorCode(info.error);
    if (code === 'invalid_link') return <Invalid />;
    return (
      <AuthCard title={t('auth.link.title')}>
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(code)}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => void info.refetch()}>
            {t('access.retry')}
          </Button>
        </div>
      </AuthCard>
    );
  }
  if (!info.data.set_password) return <SignInToAccept info={info.data} />;
  return <SetPassword token={token} info={info.data} onInvalid={() => setUsed(true)} />;
}

function Loading() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <span className="sr-only">{t('common.loading')}</span>
    </main>
  );
}

function Invalid() {
  const navigate = useNavigate();
  return (
    <AuthCard title={t('auth.link.invalidTitle')} description={errorMessage('invalid_link')}>
      <Button variant="outline" className="w-full" onClick={() => void navigate({ to: '/login' })}>
        {t('auth.backToLogin')}
      </Button>
    </AuthCard>
  );
}

function SignInToAccept({ info }: { info: LinkInfo }) {
  const navigate = useNavigate();
  return (
    <AuthCard
      title={t('auth.link.inviteTitle', { company: info.company_name })}
      description={t('auth.link.inviteSignIn', { company: info.company_name, email: info.email })}
    >
      <Button className="w-full" onClick={() => void navigate({ to: '/login', search: { email: info.email } })}>
        {t('auth.login')}
      </Button>
    </AuthCard>
  );
}

function SetPassword({ token, info, onInvalid }: { token: string; info: LinkInfo; onInvalid: () => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    let email: string;
    try {
      ({ email } = await redeemLink(token, password));
    } catch (failure) {
      const code = actionErrorCode(failure);
      if (code === 'invalid_link') return onInvalid();
      return setError(errorMessage(code));
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    // A senha já foi gravada: se a entrada falhar (sem sinal), o login resolve com ela.
    if (authError) return void navigate({ to: '/login', search: { email } });
    await navigate({ to: '/' });
  });

  const invite = info.kind === 'invite';
  return (
    <AuthCard
      title={invite ? t('auth.link.inviteTitle', { company: info.company_name }) : t('auth.link.recoveryTitle')}
      description={t(invite ? 'auth.link.inviteSetPassword' : 'auth.link.recoverySetPassword', { email: info.email })}
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <input type="email" autoComplete="username" value={info.email} readOnly hidden />
          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="password">{t('auth.newPassword')}</FieldLabel>
            <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.confirm)}>
            <FieldLabel htmlFor="confirm">{t('auth.confirmPassword')}</FieldLabel>
            <Input id="confirm" type="password" autoComplete="new-password" {...form.register('confirm')} />
            <FieldError errors={[form.formState.errors.confirm]} />
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {invite ? t('auth.link.saveAndAccept') : t('auth.link.save')}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
