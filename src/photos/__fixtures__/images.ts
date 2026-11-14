// Imagens de teste geradas no próprio navegador (projeto `browser` do Vitest).

/** Imagem com gradiente; `noise` enche de ruído aleatório (JPEG grande, difícil de comprimir). */
export async function makeImage(
  width: number,
  height: number,
  { type = 'image/png', noise = false, quality }: { type?: string; noise?: boolean; quality?: number } = {},
): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  if (noise) {
    const data = ctx.createImageData(width, height);
    const bytes = new Uint8Array(data.data.buffer);
    for (let i = 0; i < bytes.length; i += 65536) crypto.getRandomValues(bytes.subarray(i, i + 65536));
    for (let i = 3; i < bytes.length; i += 4) bytes[i] = 255;
    ctx.putImageData(data, 0, 0);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(1, '#f59e0b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.convertToBlob({ type, quality });
}

export async function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

/** O JPEG tem um segmento APP1 'Exif'? */
export async function hasExif(blob: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  for (let i = 2; i + 10 < bytes.length && bytes[i] === 0xff; ) {
    const marker = bytes[i + 1];
    if (marker === 0xda) return false; // SOS: acabaram os cabeçalhos
    const length = ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
    if (marker === 0xe1 && new TextDecoder().decode(bytes.subarray(i + 4, i + 8)) === 'Exif') return true;
    i += 2 + length;
  }
  return false;
}
