// Convite no app (06, R10 e R11): sem vínculo aceito e com convite pendente, a pessoa aceita ou recusa. Os dados do
// aparelho saem antes (a empresa antiga não fica para a nova), sem sair da conta.
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { RoleBadge } from '@/components/badges';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { actionErrorCode } from '@/lib/errors';
import { errorMessage, t } from '@/lib/i18n';
import type { Invite } from '../access';
import { LogoutButton } from '../logout-button';
import { acceptInvite, declineInvite, signOutAndWipe, wipeUser } from '../session';
import { AuthCard } from './auth-card';

export function InvitePage({ userId, invites }: { userId: string; invites: Invite[] }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void wipeUser(userId);
  }, [userId]);

  async function act(invite: Invite, decision: 'accept' | 'decline') {
    setBusy(true);
    setError(null);
    try {
      if (decision === 'accept') await acceptInvite(invite.memberId);
      else await declineInvite(invite.memberId);
    } catch (failure) {
      setBusy(false);
      setError(errorMessage(actionErrorCode(failure)));
      // O convite pode ter sido cancelado ou trocado: a lista volta do servidor.
      return void queryClient.invalidateQueries({ queryKey: ['access', userId] });
    }
    // Recusado o último convite, sai da conta com o aviso certo (não o de removido).
    if (decision === 'decline' && invites.length === 1) {
      await signOutAndWipe(userId);
      return void navigate({ to: '/login', search: { declined: true } });
    }
    await queryClient.invalidateQueries({ queryKey: ['access', userId] });
    setBusy(false);
  }

  return (
    <AuthCard title={t('access.invite.title')} description={t('access.invite.description')}>
      <div className="flex flex-col gap-4">
        {invites.map((invite) => (
          <section key={invite.memberId} className="flex flex-col gap-3 rounded-lg border p-3">
            <p className="text-sm">{t('access.invite.from', { company: invite.companyName })}</p>
            <RoleBadge role={invite.role} size="sm" />
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => void act(invite, 'accept')}>
                {t('access.invite.accept')}
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => void act(invite, 'decline')}>
                {t('access.invite.decline')}
              </Button>
            </div>
          </section>
        ))}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex justify-center">
          <LogoutButton userId={userId} />
        </div>
      </div>
    </AuthCard>
  );
}
