// Compressão antes de guardar (docs/photos.md, F1). Precisa de canvas: roda na página do técnico.
import imageCompression from 'browser-image-compression';

/** Lado maior da foto guardada (04, "Prova fotográfica"). */
export const MAX_SIDE = 1600;
export const QUALITY = 0.8;
/** Limite do R16 no backend (CHECK `file_size between 1 and 5242880`). */
export const MAX_BYTES = 5 * 1024 * 1024;

export interface CompressedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

/** JPEG com lado maior até 1600 px, ~80%; acima de `maxBytes`, reduz a qualidade (não o tamanho) até caber. */
export async function compressPhoto(
  file: Blob,
  { maxBytes = MAX_BYTES }: { maxBytes?: number } = {},
): Promise<CompressedPhoto> {
  const input = file instanceof File ? file : new File([file], 'photo', { type: file.type });
  const blob = await imageCompression(input, {
    maxWidthOrHeight: MAX_SIDE,
    initialQuality: QUALITY,
    fileType: 'image/jpeg',
    maxSizeMB: maxBytes / (1024 * 1024),
    alwaysKeepResolution: true,
    // Sem worker: o worker da biblioteca baixa o script de uma CDN, o que falha sem sinal.
    useWebWorker: false,
  });
  return { blob, ...(await dimensions(blob)) };
}

async function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
