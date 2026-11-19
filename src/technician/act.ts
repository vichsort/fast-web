// Como as telas do técnico rodam uma ação: aviso de feito, ou o texto do erro pela classe (errors.md).
import { toast } from 'sonner';
import { errorMessage } from '@/lib/i18n';
import { actionErrorCode } from '@/office/derive';
import { PhotoError } from '@/photos/errors';
import { notify, useSimulatedOffline, useSyncStatus } from './api';

/** Código do texto de uma ação que falhou: os do aparelho (fotos) e os das ações do servidor. */
export function failureCode(error: unknown): string {
  return error instanceof PhotoError ? error.code : actionErrorCode(error);
}

/** Roda a ação; com `done`, avisa ao terminar. Na falha mostra o erro e devolve `undefined`. */
export async function act<T>(work: Promise<T>, done?: string): Promise<T | undefined> {
  try {
    const result = await work;
    if (done) notify(done);
    return result;
  } catch (error) {
    toast.error(errorMessage(failureCode(error)));
    return undefined;
  }
}

/** Sem sinal: a chave de simulação nos dados de exemplo, a rede no real. */
export function useOffline(): boolean {
  const simulated = useSimulatedOffline();
  const sync = useSyncStatus();
  return simulated ? simulated.offline : sync ? !sync.online : false;
}
