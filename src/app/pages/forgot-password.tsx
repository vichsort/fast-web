import { Link } from '@tanstack/react-router';
import { t } from '@/lib/i18n';
import { AuthCard } from './auth-card';

/** O sistema não manda email (01 do backend): quem esqueceu a senha pede ao owner o link de "definir senha" (06, R14). */
export function ForgotPasswordPage() {
  return (
    <AuthCard title={t('auth.forgotTitle')} description={t('auth.forgotHelp')}>
      <div className="flex justify-center">
        <Link to="/login" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </div>
    </AuthCard>
  );
}
