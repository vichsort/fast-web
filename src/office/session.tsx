// Sessão do escritório no scratch: o papel vem do acesso real (RequireAccess); o usuário e a empresa, dos dados de
// exemplo (o "logado" nos mocks é o usuário de exemplo do papel, não o do login real).
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';
import { scratchToast } from '@/components/states';
import { errorMessage } from '@/lib/i18n';
import type { Company, PersonRef, Profile } from '@/mocks';
import { RuleError } from './mocks';

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
 * Roda uma ação de exemplo: em caso de sucesso, recarrega as leituras do escritório e mostra o aviso de scratch; em
 * erro de regra, mostra o texto do catálogo num toast, exceto os códigos em `inline`, que a tela mostra no lugar.
 * Nunca rejeita (os diálogos fecham; a tela decide o que mais mostrar).
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
        scratchToast(label);
        return { ok: true, value };
      } catch (error) {
        const code = error instanceof RuleError ? error.code : 'unknown';
        if (!options.inline?.includes(code)) toast.error(errorMessage(code));
        return { ok: false, code };
      }
    },
    [queryClient],
  );
}
