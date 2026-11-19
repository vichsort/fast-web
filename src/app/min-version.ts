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

/**
 * "Atualizar agora": busca o worker novo e o ativa (o mesmo `SKIP_WAITING` do aviso de versão nova, queue.md); sem
 * worker novo, recarrega. O banco local não é tocado.
 */
export async function updateApp(): Promise<void> {
  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  await registration?.update().catch(() => undefined);
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waiting.postMessage({ type: 'SKIP_WAITING' });
}
