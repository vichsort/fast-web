import { useNavigate } from '@tanstack/react-router';
import { LogOutIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { pendingItems, signOutAndWipe } from './session';

/**
 * Sair apaga os dados do usuário no aparelho; com envios na fila, pede confirmação antes (queue.md, Q10). Depois vai ao
 * login, ou faz `onSignedOut` (a página do link continua nela).
 */
export function LogoutButton({
  userId,
  onSignedOut,
  label,
}: {
  userId: string;
  onSignedOut?: () => void;
  label?: string;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    const pending = await pendingItems(userId);
    if (pending > 0 && !window.confirm(t('common.logoutWithPending', { count: pending }))) return setBusy(false);
    await signOutAndWipe(userId);
    if (onSignedOut) return onSignedOut();
    await navigate({ to: '/login' });
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void logout()} disabled={busy}>
      <LogOutIcon />
      {label ?? t('common.logout')}
    </Button>
  );
}
