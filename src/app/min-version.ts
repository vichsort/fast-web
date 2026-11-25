// Versão mínima do app (01, R8 do backend; docs/e2e.md, Versionamento): abaixo dela, a guarda das interfaces mostra
// "Atualize o app" no lugar da interface, e a fila da página para; os itens ficam no banco local.
import { useQuery } from '@tanstack/react-query';
import { usingMocks } from '@/lib/data-source';
import { supabase } from '@/lib/supabase';
import { APP_VERSION, isBelowMinimum } from '@/lib/version';

async function minimumVersion(): Promise<string | null> {
  const { data, error } = await supabase.from('app_settings').select('min_client_version').limit(1).retry(false);
  if (error) throw error;
  return data[0]?.min_client_version ?? null;
}

/** Este build está abaixo da mínima? Sem resposta (sem sinal, erro), não: o app não trava por falta de rede. */
export function useUpdateRequired(enabled: boolean): boolean {
  const { data } = useQuery({
    queryKey: ['app', 'min-version'],
    enabled: enabled && !usingMocks,
    networkMode: 'always',
    retry: false,
    staleTime: 10 * 60_000,
    queryFn: minimumVersion,
  });
  return data ? isBelowMinimum(APP_VERSION, data) : false;
}

/** Ativa o worker novo que espera (`SKIP_WAITING`, src/sw.ts) e recarrega quando ele assume. O banco local fica. */
export function activateWaitingWorker(waiting: ServiceWorker): void {
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

/** Busca o worker novo e o ativa; sem worker novo (ou sem worker, no escritório), recarrega. */
export async function updateApp(): Promise<void> {
  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  await registration?.update().catch(() => undefined);
  const waiting = registration?.waiting;
  if (waiting) return activateWaitingWorker(waiting);
  window.location.reload();
}

const AUTO_UPDATE_KEY = 'fast.autoUpdate';

/**
 * Abaixo da mínima, o app atualiza sozinho uma vez por versão e por sessão; se continuar abaixo depois disso (a versão
 * nova ainda não chegou ao servidor), mostra o botão, em vez de recarregar sem parar.
 */
export function autoUpdateOnce(storage: Pick<Storage, 'getItem' | 'setItem'> | null, version: string): boolean {
  try {
    if (!storage || storage.getItem(AUTO_UPDATE_KEY) === version) return false;
    storage.setItem(AUTO_UPDATE_KEY, version);
    return true;
  } catch {
    return false;
  }
}
