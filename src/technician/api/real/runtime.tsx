// Liga a interface do técnico à fonte real: sessão, banco local ao vivo, cache persistido e o processador da fila.
// Com os dados de exemplo, só repassa as telas.

import { useRegisterSW } from 'virtual:pwa-register/react';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import type { Access } from '@/app/access';
import { updateGate } from '@/app/app-update';
import { useAuth } from '@/app/auth-context';
import { activateWaitingWorker } from '@/app/min-version';
import { LoadingDetail } from '@/components/states';
import { usingMocks } from '@/lib/data-source';
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

/** De quanto em quanto tempo o worker procura versão nova, além de ao voltar à aba. */
const UPDATE_CHECK_MS = 10 * 60_000;

/**
 * Registra o worker (precache e fila no Background Sync), que é do técnico: o escritório trabalha online. A versão nova
 * entra sozinha (app-update.ts): na abertura, se o worker novo já esperava; senão, na próxima troca de tela, fora da
 * câmera, do seletor da galeria e das gravações do rascunho. Recarregar não perde nada: rascunhos, fotos e fila estão
 * no Dexie.
 */
function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      if (registration.waiting) return void activateWaitingWorker(registration.waiting);
      const check = () => void registration.update().catch(() => undefined);
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    },
  });

  React.useEffect(() => {
    if (!needRefresh) return;
    updateGate.ready(async () => {
      // Página controlada: o worker novo assume e ela recarrega (`controlling`). Na primeira visita, ainda sem
      // controle, o worker novo nunca assume esta página: recarrega direto.
      if (navigator.serviceWorker.controller) return updateServiceWorker(true);
      await updateServiceWorker(false);
      window.location.reload();
    });
  }, [needRefresh, updateServiceWorker]);
}
