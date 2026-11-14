import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext } from 'react';
import { useSession } from './session';

const SessionContext = createContext<{ session: Session | null; ready: boolean } | null>(null);

/** Uma assinatura só do estado do Auth para o app inteiro. */
export function SessionProvider({ children }: { children: ReactNode }) {
  return <SessionContext.Provider value={useSession()}>{children}</SessionContext.Provider>;
}

export function useAuth() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useAuth fora do SessionProvider');
  return value;
}
