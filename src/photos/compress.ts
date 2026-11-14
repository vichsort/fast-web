// Compressão antes de guardar (docs/photos.md, F1). Precisa de canvas: roda na página do técnico.
import imageCompression from 'browser-image-compression';

/** Lado maior da foto guardada (04, "Prova fotográfica"). */
export const MAX_SIDE = 1600;
export const QUALITY = 0.8;
const MIN_QUALITY = 0.01;
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
  // A biblioteca baixa a qualidade em poucos passos (5% cada) e pode parar acima do limite; aí recomeça do
  // original com metade da qualidade, até caber.
  for (let quality = QUALITY; quality >= MIN_QUALITY; quality /= 2) {
    const blob = await imageCompression(input, {
      maxWidthOrHeight: MAX_SIDE,
      initialQuality: quality,
      fileType: 'image/jpeg',
      maxSizeMB: maxBytes / (1024 * 1024),
      alwaysKeepResolution: true,
      // Sem worker: o worker da biblioteca baixa o script de uma CDN, o que falha sem sinal.
      useWebWorker: false,
    });
    if (blob.size <= maxBytes) return { blob, ...(await dimensions(blob)) };
  }
  // Inalcançável com 1600 px e o limite do R16: um JPEG desses com qualidade mínima tem poucas centenas de KB.
  throw new Error('photo_too_large');
}

async function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
