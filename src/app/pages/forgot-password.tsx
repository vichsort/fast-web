import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
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

const schema = z.object({ email: z.email(t('auth.invalidEmail')) });

/** O link do email volta para a raiz do app (site_url do Auth), que abre "definir senha" (access.ts, authLinkType). */
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (authError) return setError(authErrorText(authError));
    setSent(true);
  });

  return (
    <AuthCard title={t('auth.forgotTitle')} description={sent ? undefined : t('auth.forgotHelp')}>
      <FieldGroup>
        {sent ? (
          <Alert>
            <AlertDescription>{t('auth.forgotSent')}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.email)}>
                <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
                <Input id="email" type="email" autoComplete="email" inputMode="email" {...form.register('email')} />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t('auth.forgotSend')}
              </Button>
            </FieldGroup>
          </form>
        )}
        <Link to="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </FieldGroup>
    </AuthCard>
  );
}
