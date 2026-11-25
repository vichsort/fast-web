// Atualização automática (decisions.md, Versão e atualização): a versão nova entra ao abrir o app ou na próxima troca
// de tela, nunca no meio de uma tela, e nunca com a câmera, o seletor da galeria ou uma foto sendo processada (que
// seguram a atualização). Quem detecta a versão nova é cada interface: o service worker no técnico, o version.json no
// escritório (version-check.ts); as duas chamam `ready` com o que aplica (recarregar).
import { useEffect } from 'react';

export interface UpdateGate {
  /** Há versão nova; `apply` recarrega com ela. */
  ready(apply: () => unknown): void;
  /** Segura a atualização até a função devolvida ser chamada. */
  hold(): () => void;
  /** A tela mudou: aplica se há versão nova e nada segura. Diz se aplicou. */
  screenChanged(): boolean;
}

export function createUpdateGate(): UpdateGate {
  let pending: (() => unknown) | null = null;
  let holds = 0;
  return {
    ready(apply) {
      pending = apply;
    },
    hold() {
      holds += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holds -= 1;
      };
    },
    screenChanged() {
      if (!pending || holds > 0) return false;
      const apply = pending;
      pending = null;
      void apply();
      return true;
    },
  };
}

/** A porta da página. */
export const updateGate = createUpdateGate();

/** Segura a atualização enquanto `active` (câmera aberta, seletor da galeria, foto em processamento). */
export function useHoldUpdate(active: boolean): void {
  useEffect(() => (active ? updateGate.hold() : undefined), [active]);
}
