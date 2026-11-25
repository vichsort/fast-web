import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { authErrorText } from '../auth-errors';
import { AuthCard } from './auth-card';

const schema = z.object({
  email: z.email(t('auth.invalidEmail')),
  password: z.string().min(1, t('auth.passwordRequired')),
});

export function LoginPage() {
  const navigate = useNavigate();
  const { removed, declined, email: invitedEmail } = useSearch({ from: '/login' });
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: invitedEmail ?? '', password: '' },
  });

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) return setError(authErrorText(authError));
    await navigate({ to: '/' });
  });

  return (
    <AuthCard title={t('auth.loginTitle')}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          {removed && (
            <Alert>
              <AlertDescription>{t('auth.removed')}</AlertDescription>
            </Alert>
          )}
          {declined && (
            <Alert>
              <AlertDescription>{t('auth.declined')}</AlertDescription>
            </Alert>
          )}
          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
            <Input id="email" type="email" autoComplete="email" inputMode="email" {...form.register('email')} />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
            <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('auth.login')}
          </Button>
          <Link
            to="/forgot-password"
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t('auth.forgotLink')}
          </Link>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
