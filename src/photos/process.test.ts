import { EMPTY_JPEG, jpegBlob } from './__fixtures__/exif';
import type { CompressedPhoto } from './compress';
import { processPhoto } from './process';

/** Compressão falsa (canvas só existe no projeto `browser`): devolve um JPEG sem EXIF e guarda o que recebeu. */
const fakeCompress = () => {
  const received: Blob[] = [];
  const compressed: CompressedPhoto = {
    blob: new Blob([EMPTY_JPEG], { type: 'image/jpeg' }),
    width: 1600,
    height: 1200,
  };
  const compress = async (file: Blob) => {
    received.push(file);
    return compressed;
  };
  return { compress, received, compressed };
};

const exifFile = () =>
  jpegBlob({
    dateTimeOriginal: '2026:11:06 10:05:00',
    offsetTimeOriginal: '-03:00',
    gps: { latitude: -23.5613, longitude: -46.6565, hPositioningError: 4.5 },
  });

describe('process photo', () => {
  it('F1: the stored photo is the compressed one, with its width and height', async () => {
    const { compress, received, compressed } = fakeCompress();
    const file = exifFile();

    const photo = await processPhoto({ source: 'gallery', file }, { compress });

    expect(received).toEqual([file]);
    expect(photo).toMatchObject({ source: 'gallery', blob: compressed.blob, width: 1600, height: 1200 });
  });

  it('F2: camera captured_at is the device clock at the click, not the EXIF of the file', async () => {
    const { compress } = fakeCompress();
    const clickedAt = new Date('2026-11-13T14:30:15.123Z');

    const photo = await processPhoto({ source: 'camera', file: exifFile(), clickedAt }, { compress });

    expect(photo.capturedAt).toBe('2026-11-13T14:30:15.123Z');
  });

  it('F3: camera location is the position the screen passes, with its accuracy', async () => {
    const { compress } = fakeCompress();
    const coords = { latitude: -22.9, longitude: -43.2, accuracy: 15 };

    const photo = await processPhoto(
      { source: 'camera', file: exifFile(), clickedAt: new Date(), coords },
      { compress },
    );

    expect(photo).toMatchObject({ latitude: -22.9, longitude: -43.2, accuracyM: 15 });
  });

  it('F3: camera without position (not allowed or not available) has no location, even with GPS in the file', async () => {
    const { compress } = fakeCompress();

    for (const coords of [undefined, null]) {
      const photo = await processPhoto(
        { source: 'camera', file: exifFile(), clickedAt: new Date(), coords },
        { compress },
      );
      expect(photo).toMatchObject({ latitude: null, longitude: null, accuracyM: null });
    }
  });

  it('F3: camera position out of range gives no location', async () => {
    const { compress } = fakeCompress();
    const coords = { latitude: 91, longitude: -43.2, accuracy: 15 };

    const photo = await processPhoto(
      { source: 'camera', file: exifFile(), clickedAt: new Date(), coords },
      { compress },
    );

    expect(photo).toMatchObject({ latitude: null, longitude: null, accuracyM: null });
  });

  it('F2/F3: gallery captured_at and location come from the EXIF of the original file, not the compressed one', async () => {
    const { compress } = fakeCompress();

    const photo = await processPhoto({ source: 'gallery', file: exifFile() }, { compress });

    expect(photo.capturedAt).toBe('2026-11-06T13:05:00.000Z');
    expect(photo.latitude).toBeCloseTo(-23.5613, 6);
    expect(photo.longitude).toBeCloseTo(-46.6565, 6);
    expect(photo.accuracyM).toBe(4.5);
  });
});
