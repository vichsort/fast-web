import { jpegBlob } from './__fixtures__/exif';
import { hasExif, makeImage } from './__fixtures__/images';
import { processPhoto } from './process';

describe('process photo in the browser', () => {
  it('F1/F2/F3: a gallery photo keeps the EXIF proof after the real compression erases the EXIF', async () => {
    const jpeg = new Uint8Array(await (await makeImage(2400, 1800, { type: 'image/jpeg' })).arrayBuffer());
    const file = jpegBlob(
      {
        dateTimeOriginal: '2026:11:06 10:05:00',
        offsetTimeOriginal: '-03:00',
        gps: { latitude: -23.5613, longitude: -46.6565, hPositioningError: 4.5 },
      },
      jpeg,
    );

    const photo = await processPhoto({ source: 'gallery', file });

    expect(await hasExif(photo.blob)).toBe(false);
    expect(photo).toMatchObject({
      source: 'gallery',
      width: 1600,
      height: 1200,
      capturedAt: '2026-11-06T13:05:00.000Z',
    });
    expect(photo.latitude).toBeCloseTo(-23.5613, 6);
    expect(photo.longitude).toBeCloseTo(-46.6565, 6);
    expect(photo.accuracyM).toBe(4.5);
  });
});
