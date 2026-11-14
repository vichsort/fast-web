import { jpegBlob } from './__fixtures__/exif';
import { dimensions, hasExif, makeImage } from './__fixtures__/images';
import { compressPhoto } from './compress';

describe('compress photo', () => {
  it('F1: landscape photo becomes a JPEG with the longer side at 1600 px', async () => {
    const out = await compressPhoto(await makeImage(3000, 2000));

    expect(out.blob.type).toBe('image/jpeg');
    expect(out.width).toBe(1600);
    expect(out.height).toBe(1066);
    expect(await dimensions(out.blob)).toEqual({ width: out.width, height: out.height });
  });

  it('F1: portrait photo has the height at 1600 px', async () => {
    const out = await compressPhoto(await makeImage(1000, 2400, { type: 'image/jpeg', quality: 0.95 }));

    expect(out.blob.type).toBe('image/jpeg');
    expect({ width: out.width, height: out.height }).toEqual({ width: 666, height: 1600 });
    expect(await dimensions(out.blob)).toEqual({ width: 666, height: 1600 });
  });

  it('F1: a smaller photo keeps its size and still becomes a JPEG', async () => {
    const out = await compressPhoto(await makeImage(800, 600));

    expect(out.blob.type).toBe('image/jpeg');
    expect(await dimensions(out.blob)).toEqual({ width: 800, height: 600 });
    expect({ width: out.width, height: out.height }).toEqual({ width: 800, height: 600 });
  });

  it('F1: the compressed photo carries no EXIF', async () => {
    const jpeg = new Uint8Array(await (await makeImage(400, 300, { type: 'image/jpeg' })).arrayBuffer());
    const original = jpegBlob(
      { dateTimeOriginal: '2026:11:06 10:05:00', gps: { latitude: -23.5, longitude: -46.6 } },
      jpeg,
    );
    expect(await hasExif(original)).toBe(true);

    const out = await compressPhoto(original);

    expect(await hasExif(out.blob)).toBe(false);
  });

  it('F1: width and height are those of the upright photo (EXIF orientation applied)', async () => {
    const jpeg = new Uint8Array(await (await makeImage(400, 200, { type: 'image/jpeg' })).arrayBuffer());

    const out = await compressPhoto(jpegBlob({ orientation: 6 }, jpeg));

    expect({ width: out.width, height: out.height }).toEqual({ width: 200, height: 400 });
    expect(await dimensions(out.blob)).toEqual({ width: 200, height: 400 });
  });
});
