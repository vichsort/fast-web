import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { clearAuthLink, supabase } from '@/lib/supabase';
import { authErrorText } from '../auth-errors';
import { AuthCard } from './auth-card';

/** Mínimo do Auth local (minimum_password_length); o servidor confere de novo (weak_password). */
const MIN_PASSWORD = 6;

const schema = z
  .object({
    password: z.string().min(MIN_PASSWORD, t('auth.passwordTooShort', { min: MIN_PASSWORD })),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: t('auth.passwordsDiffer') });

/** Quem chega pelo link do convite ou da recuperação já está logado (sessão do link); aqui só escolhe a senha. */
export function SetPasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) return setError(authErrorText(authError));
    clearAuthLink();
    await navigate({ to: '/' });
  });

  return (
    <AuthCard title={t('auth.setPasswordTitle')} description={t('auth.setPasswordHelp')}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
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
            {t('auth.setPasswordSave')}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
