import { newDb } from './queue/testing';
import { pruneSeenPhotos, saveSeenPhotos } from './seen-photos';

const blob = (text: string) => new Blob([text], { type: 'image/jpeg' });
const photos = (...ids: string[]) => ids.map((id) => ({ id, url: `https://storage.test/${id}` }));

describe('seen photos', () => {
  it('F8: downloads, one at a time, only the photos not yet on the device, and keeps them as files of the user', async () => {
    const db = newDb();
    await db.seenPhotos.put({ userId: 'u1', photoId: 'p1', orderId: 'o1', blob: blob('old'), savedAt: 'x' });
    await db.seenPhotos.put({ userId: 'u2', photoId: 'p2', orderId: 'o1', blob: blob('other'), savedAt: 'x' });
    const asked: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const download = async (url: string) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      asked.push(url);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
      return blob(url);
    };

    await saveSeenPhotos(db, { userId: 'u1', orderId: 'o1', photos: photos('p1', 'p2', 'p3'), download });

    expect(asked).toEqual(['https://storage.test/p2', 'https://storage.test/p3']);
    expect(maxRunning).toBe(1);
    const mine = await db.seenPhotos.where('userId').equals('u1').toArray();
    expect(mine.map((p) => [p.photoId, p.orderId]).sort()).toEqual([
      ['p1', 'o1'],
      ['p2', 'o1'],
      ['p3', 'o1'],
    ]);
    expect(await mine.find((p) => p.photoId === 'p3')?.blob.text()).toBe('https://storage.test/p3');
  });

  it('F8: a failed download skips that photo and goes on with the others', async () => {
    const db = newDb();
    const download = async (url: string) => {
      if (url.endsWith('p1')) throw new TypeError('Failed to fetch');
      return blob(url);
    };

    await saveSeenPhotos(db, { userId: 'u1', orderId: 'o1', photos: photos('p1', 'p2'), download });

    expect((await db.seenPhotos.toArray()).map((p) => p.photoId)).toEqual(['p2']);
  });

  it('F8: a refused write (no space) stops quietly', async () => {
    const db = newDb();
    vi.spyOn(db.seenPhotos, 'put').mockRejectedValue(new DOMException('full', 'QuotaExceededError'));
    const download = vi.fn(async (url: string) => blob(url));

    await expect(
      saveSeenPhotos(db, { userId: 'u1', orderId: 'o1', photos: photos('p1', 'p2'), download }),
    ).resolves.toBeUndefined();
    vi.restoreAllMocks();
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('F10: photos leave with the order: only the orders still listed for the user are kept', async () => {
    const db = newDb();
    for (const [userId, photoId, orderId] of [
      ['u1', 'p1', 'o1'],
      ['u1', 'p2', 'o2'],
      ['u2', 'p3', 'o2'],
    ] as const) {
      await db.seenPhotos.put({ userId, photoId, orderId, blob: blob(photoId), savedAt: 'x' });
    }

    await pruneSeenPhotos(db, 'u1', ['o1']);

    expect((await db.seenPhotos.toArray()).map((p) => p.photoId).sort()).toEqual(['p1', 'p3']);
  });
});
