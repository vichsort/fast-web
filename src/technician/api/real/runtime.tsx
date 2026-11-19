// Liga a interface do técnico à fonte real: sessão, banco local ao vivo, cache persistido e o processador da fila.
// Com os dados de exemplo, só repassa as telas.
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import type { Access } from '@/app/access';
import { useAuth } from '@/app/auth-context';
import { LoadingDetail } from '@/components/states';
import { usingMocks } from '@/lib/data-source';
import { bindTechnician } from './context';
import { stopLocal, watchLocal } from './local';
import { persistTechnicianCache } from './persist';
import { kick, onAfterRun, stopRunner } from './runner';

export function TechnicianRuntime({ access, children }: { access: Access; children: React.ReactNode }) {
  if (usingMocks || !('companyId' in access)) return children;
  return (
    <RealRuntime companyId={access.companyId} role={access.role}>
      {children}
    </RealRuntime>
  );
}

function RealRuntime({
  companyId,
  role,
  children,
}: {
  companyId: string;
  role: Extract<Access, { companyId: string }>['role'];
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const [restored, setRestored] = React.useState(false);
  if (userId) bindTechnician({ userId, companyId, role, queryClient });

  React.useEffect(() => {
    if (!userId) return;
    watchLocal(userId);
    const [stopPersist, restoring] = persistTechnicianCache(queryClient, userId);
    void restoring.finally(() => setRestored(true));
    return () => {
      stopPersist();
      stopLocal();
      stopRunner();
    };
  }, [queryClient, userId]);

  React.useEffect(() => {
    if (!userId || !restored) return;
    void kick();
    const wake = () => void kick();
    const visible = () => {
      if (document.visibilityState !== 'visible') return;
      void kick();
      void queryClient.invalidateQueries({ queryKey: ['technician'] });
    };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', visible);
    const stopAfter = onAfterRun(({ sent, refused }) => {
      if (sent) void queryClient.invalidateQueries({ queryKey: ['technician'] });
      // Recusa por regra: confere o próprio vínculo (offline.md, proteção dos dados); o gate apaga e sai se sumiu.
      if (refused) void queryClient.invalidateQueries({ queryKey: ['access', userId] });
    });
    return () => {
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', visible);
      stopAfter();
    };
  }, [queryClient, restored, userId]);

  if (!restored) return <LoadingDetail />;
  return children;
}
