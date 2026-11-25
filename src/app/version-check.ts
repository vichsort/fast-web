// Versão nova no escritório, que não tem service worker (decisions.md, Versão e atualização): o build publica
// `version.json` (vite.config.ts); a tela lê de tempos em tempos e ao voltar à aba e, com outra versão no servidor,
// recarrega na próxima troca de tela (app-update.ts). Uma vez por versão e sessão: se a CDN ainda serve o build velho,
// não recarrega sem parar.
import { useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';
import { updateGate } from './app-update';

/** De quanto em quanto tempo o escritório procura versão nova, além de ao voltar à aba. */
const CHECK_MS = 10 * 60_000;
const RELOAD_KEY = 'fast.reloadFor';

/** A versão para a qual recarregar, ou `null` (a mesma, ou sem resposta). Outra qualquer vale: um deploy desfeito. */
export function reloadTarget(remote: string | null, current: string): string | null {
  return remote && remote !== current ? remote : null;
}

/** `true` só na primeira vez de `value` em `key` nesta sessão; sem sessionStorage, nunca. */
export function onceInSession(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  key: string,
  value: string,
): boolean {
  try {
    if (!storage || storage.getItem(key) === value) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

async function remoteVersion(): Promise<string | null> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const { version } = (await response.json()) as { version?: unknown };
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}

/** Procura versão nova ao montar, a cada 10 min e ao voltar à aba. Só no build (no dev não há version.json). */
export function useVersionCheck(): void {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const check = async () => {
      const target = reloadTarget(await remoteVersion(), APP_VERSION);
      if (!target) return;
      updateGate.ready(() => {
        if (onceInSession(sessionStorageOrNull(), RELOAD_KEY, target)) window.location.reload();
      });
    };
    const visible = () => document.visibilityState === 'visible' && void check();
    void check();
    const timer = setInterval(() => void check(), CHECK_MS);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
}
