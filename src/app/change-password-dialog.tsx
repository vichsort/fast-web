// "Trocar a senha" no Perfil das duas interfaces: senha atual, nova e a repetição (change-password.ts).
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { changePassword } from './change-password';

/** Mínimo do Auth (minimum_password_length); o Auth confere de novo. */
const MIN_PASSWORD = 6;

const schema = z
  .object({
    current: z.string().min(1, t('auth.passwordRequired')),
    next: z.string().min(MIN_PASSWORD, t('auth.passwordTooShort', { min: MIN_PASSWORD })),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: t('auth.passwordsDiffer') });
type Values = z.infer<typeof schema>;
const empty: Values = { current: '', next: '', confirm: '' };

export function ChangePasswordButton({ email, className }: { email: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { current: useId(), next: useId(), confirm: useId() };
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const { errors, isSubmitting } = form.formState;

  function openChange(next: boolean) {
    if (isSubmitting) return;
    setOpen(next);
    if (!next) {
      form.reset(empty);
      setError(null);
    }
  }

  const submit = form.handleSubmit(async ({ current, next }) => {
    setError(null);
    const result = await changePassword(supabase.auth, email, current, next);
    if (result.ok) {
      toast.success(t('auth.passwordChanged'));
      return openChange(false);
    }
    if (result.field) form.setError(result.field, { message: result.message });
    else setError(result.message);
  });

  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        <KeyRound />
        {t('auth.changePassword')}
      </Button>
      <Dialog open={open} onOpenChange={openChange}>
        <DialogContent>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t('auth.changePassword')}</DialogTitle>
              <DialogDescription>{t('auth.changePasswordHelp')}</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <input type="email" autoComplete="username" value={email} readOnly hidden />
              <Field data-invalid={Boolean(errors.current)}>
                <FieldLabel htmlFor={ids.current}>{t('auth.currentPassword')}</FieldLabel>
                <Input id={ids.current} type="password" autoComplete="current-password" {...form.register('current')} />
                <FieldError errors={[errors.current]} />
              </Field>
              <Field data-invalid={Boolean(errors.next)}>
                <FieldLabel htmlFor={ids.next}>{t('auth.newPassword')}</FieldLabel>
                <Input id={ids.next} type="password" autoComplete="new-password" {...form.register('next')} />
                <FieldError errors={[errors.next]} />
              </Field>
              <Field data-invalid={Boolean(errors.confirm)}>
                <FieldLabel htmlFor={ids.confirm}>{t('auth.confirmPassword')}</FieldLabel>
                <Input id={ids.confirm} type="password" autoComplete="new-password" {...form.register('confirm')} />
                <FieldError errors={[errors.confirm]} />
              </Field>
            </FieldGroup>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner aria-hidden />}
                {t('auth.changePasswordSave')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
