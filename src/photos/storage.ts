// Espaço antes de capturar (docs/photos.md, F4).

export type StorageEstimateFn = () => Promise<StorageEstimate>;

/** Abaixo disto, a tela avisa antes de abrir a câmera. */
export const MIN_FREE_BYTES = 20 * 1024 * 1024;

const browserEstimate: StorageEstimateFn | undefined =
  typeof navigator !== 'undefined' && navigator.storage?.estimate ? () => navigator.storage.estimate() : undefined;

/** `false`: menos de 20 MB livres, avisar. Sem a API ou sem resposta útil, não bloqueia. */
export async function hasSpaceToCapture(estimate: StorageEstimateFn | undefined = browserEstimate): Promise<boolean> {
  if (!estimate) return true;
  try {
    const { quota, usage } = await estimate();
    if (quota === undefined || usage === undefined) return true;
    return quota - usage >= MIN_FREE_BYTES;
  } catch {
    return true;
  }
}
