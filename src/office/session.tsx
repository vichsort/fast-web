// Sessão do escritório: o papel vem do acesso real (RequireAccess); o usuário e a empresa, da fonte de dados
// (com os dados de exemplo, o "logado" é o usuário de exemplo do papel, não o do login real).
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';
import { scratchToast } from '@/components/states';
import { usingMocks } from '@/lib/data-source';
import { errorMessage, t } from '@/lib/i18n';
import type { Company, PersonRef, Profile } from '@/mocks';
import { ApiError } from '@/offline/queue/errors';
import { actionErrorCode } from './derive';

export interface OfficeSession {
  role: 'owner' | 'manager';
  isOwner: boolean;
  user: Profile;
  /** Quem faz as ações (autor no histórico e na auditoria). */
  actor: PersonRef;
  company: Company;
  timeZone: string;
}

const OfficeContext = React.createContext<OfficeSession | null>(null);
export const OfficeSessionProvider = OfficeContext.Provider;

export function useOffice(): OfficeSession {
  const value = React.useContext(OfficeContext);
  if (!value) throw new Error('useOffice fora do layout do escritório');
  return value;
}

export type ActionResult<T> = { ok: true; value: T } | { ok: false; code: string };

/**
 * Roda uma ação: em caso de sucesso, recarrega as leituras do escritório e avisa (com os dados de exemplo, o aviso de
 * scratch); na falha, mostra o texto do código (derive.ts, `actionErrorCode`) num toast, exceto os códigos em
 * `inline`, que a tela mostra no lugar. Nunca rejeita (os diálogos fecham; a tela decide o que mais mostrar).
 */
export function useOfficeAction() {
  const queryClient = useQueryClient();
  return React.useCallback(
    async <T,>(
      label: string,
      action: () => Promise<T>,
      options: { inline?: string[] } = {},
    ): Promise<ActionResult<T>> => {
      try {
        const value = await action();
        await queryClient.invalidateQueries({ queryKey: ['office'] });
        if (usingMocks) scratchToast(label);
        else toast.success(t('ui.actionDone', { action: label }));
        return { ok: true, value };
      } catch (error) {
        const code = actionErrorCode(error);
        // Recusa por regra quase sempre quer dizer tela desatualizada (conflito, revisão velha, status mudou).
        if (error instanceof ApiError && error.errorClass === 'rule') {
          void queryClient.invalidateQueries({ queryKey: ['office'] });
        }
        if (!options.inline?.includes(code)) toast.error(errorMessage(code));
        return { ok: false, code };
      }
    },
    [queryClient],
  );
}
