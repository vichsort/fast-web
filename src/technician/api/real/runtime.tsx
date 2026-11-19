// Liga a interface do técnico à fonte real: sessão, banco local ao vivo, cache persistido e o processador da fila.
// Com os dados de exemplo, só repassa as telas.

import { useRegisterSW } from 'virtual:pwa-register/react';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';
import type { Access } from '@/app/access';
import { useAuth } from '@/app/auth-context';
import { LoadingDetail } from '@/components/states';
import { usingMocks } from '@/lib/data-source';
import { t } from '@/lib/i18n';
import { onSupabaseResponse } from '@/lib/supabase';
import { bindTechnician } from './context';
import { stopLocal, watchLocal } from './local';
import { persistTechnicianCache } from './persist';
import { hintConnectivity, kick, listenToWorker, onAfterRun, stopRunner } from './runner';
import { requestStorageProtection } from './storage';

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
  useAppUpdate();
  const userId = session?.user.id;
  const [restored, setRestored] = React.useState(false);
  if (userId) bindTechnician({ userId, companyId, role, queryClient });

  React.useEffect(() => {
    if (!userId) return;
    requestStorageProtection();
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
    // Sinal de volta: o que espera por rede vai já (Q7); sem nada esperando, roda a fila assim mesmo.
    const wake = () =>
      void hintConnectivity().then((kicked) => {
        if (!kicked) void kick();
      });
    const stopResponses = onSupabaseResponse(() => void hintConnectivity());
    const visible = () => {
      if (document.visibilityState !== 'visible') return;
      void kick();
      void queryClient.invalidateQueries({ queryKey: ['technician'] });
    };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', visible);
    const stopWorker = listenToWorker();
    const stopAfter = onAfterRun(({ sent, refused }) => {
      if (sent) void queryClient.invalidateQueries({ queryKey: ['technician'] });
      // Recusa por regra: confere o próprio vínculo (offline.md, proteção dos dados); o gate apaga e sai se sumiu.
      if (refused) void queryClient.invalidateQueries({ queryKey: ['access', userId] });
    });
    return () => {
      window.removeEventListener('online', wake);
      stopResponses();
      document.removeEventListener('visibilitychange', visible);
      stopWorker();
      stopAfter();
    };
  }, [queryClient, restored, userId]);

  if (!restored) return <LoadingDetail />;
  return children;
}

/**
 * Registra o worker (precache e fila no Background Sync), que é do técnico: o escritório trabalha online. Versão
 * nova só entra quando o técnico toca em "Atualizar", nunca no meio da câmera ou de um rascunho.
 */
function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  React.useEffect(() => {
    if (!needRefresh) return;
    toast(t('technician.update.available'), {
      id: 'app-update',
      description: t('technician.update.availableHint'),
      duration: Number.POSITIVE_INFINITY,
      action: { label: t('technician.update.reload'), onClick: () => void updateServiceWorker(true) },
    });
  }, [needRefresh, updateServiceWorker]);
}
