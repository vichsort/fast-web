// Fotos do servidor já vistas, guardadas como arquivo para a O.S. abrir sem sinal (docs/photos.md, F8 a F10).
// A URL assinada expira em minutos; o arquivo fica até a O.S. sair da lista do técnico ou ele sair do app.
import type { FastDb } from './db';

/**
 * F8: baixa, uma por vez, as fotos da O.S. que o usuário ainda não tem no aparelho. Melhor esforço: download que
 * falha pula a foto (tenta na próxima abertura); gravação recusada (sem espaço) para, sem erro.
 */
export async function saveSeenPhotos(
  db: FastDb,
  input: {
    userId: string;
    orderId: string;
    photos: { id: string; url: string }[];
    download: (url: string) => Promise<Blob>;
  },
): Promise<void> {
  const { userId, orderId, download } = input;
  const stored = new Set(
    (await db.seenPhotos.where('userId').equals(userId).primaryKeys()).map((key) => (key as unknown as string[])[1]),
  );
  for (const photo of input.photos) {
    if (stored.has(photo.id) || !photo.url) continue;
    let blob: Blob;
    try {
      blob = await download(photo.url);
    } catch {
      continue;
    }
    try {
      await db.seenPhotos.put({ userId, photoId: photo.id, orderId, blob, savedAt: new Date().toISOString() });
    } catch {
      return;
    }
  }
}

/** F10: as fotos saem junto com a O.S.: ficam só as das O.S. ainda na lista do usuário. */
export async function pruneSeenPhotos(db: FastDb, userId: string, keepOrderIds: Iterable<string>): Promise<void> {
  const keep = new Set(keepOrderIds);
  await db.seenPhotos
    .where('userId')
    .equals(userId)
    .filter((p) => !keep.has(p.orderId))
    .delete();
}
