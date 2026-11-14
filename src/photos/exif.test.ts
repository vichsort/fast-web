import { EMPTY_JPEG, jpegBlob } from './__fixtures__/exif';
import { readExifProof } from './exif';

const noLocation = { latitude: null, longitude: null, accuracyM: null };

describe('captured_at from EXIF', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('F2: with OffsetTimeOriginal, DateTimeOriginal is read in that offset', async () => {
    process.env.TZ = 'Asia/Tokyo';
    const file = jpegBlob({ dateTimeOriginal: '2026:11:06 10:05:00', offsetTimeOriginal: '-03:00' });
    expect((await readExifProof(file)).capturedAt).toBe('2026-11-06T13:05:00.000Z');
  });

  it('F2: with a positive OffsetTimeOriginal with minutes', async () => {
    const file = jpegBlob({ dateTimeOriginal: '2026:11:06 10:05:00', offsetTimeOriginal: '+05:45' });
    expect((await readExifProof(file)).capturedAt).toBe('2026-11-06T04:20:00.000Z');
  });

  it('F2: without OffsetTimeOriginal, DateTimeOriginal is read in the device time zone', async () => {
    const file = jpegBlob({ dateTimeOriginal: '2026:11:06 10:05:00' });
    process.env.TZ = 'America/Sao_Paulo';
    expect((await readExifProof(file)).capturedAt).toBe('2026-11-06T13:05:00.000Z');
    process.env.TZ = 'Asia/Tokyo';
    expect((await readExifProof(file)).capturedAt).toBe('2026-11-06T01:05:00.000Z');
  });

  it('F2: without DateTimeOriginal, captured_at is null (the modification date does not count)', async () => {
    const file = jpegBlob({ dateTime: '2026:11:06 10:05:00', gps: { latitude: -23.5, longitude: -46.6 } });
    expect((await readExifProof(file)).capturedAt).toBeNull();
  });

  it('F2: an invalid DateTimeOriginal is null', async () => {
    for (const dateTimeOriginal of ['0000:00:00 00:00:00', '2026:02:30 10:00:00', '    :  :     :  :  ', 'garbage']) {
      expect((await readExifProof(jpegBlob({ dateTimeOriginal }))).capturedAt).toBeNull();
    }
  });

  it('F2: an invalid OffsetTimeOriginal falls back to the device time zone', async () => {
    process.env.TZ = 'America/Sao_Paulo';
    const file = jpegBlob({ dateTimeOriginal: '2026:11:06 10:05:00', offsetTimeOriginal: 'xx:xx' });
    expect((await readExifProof(file)).capturedAt).toBe('2026-11-06T13:05:00.000Z');
  });

  it('F2/F3: a JPEG without EXIF has no captured_at and no location', async () => {
    const file = new Blob([EMPTY_JPEG], { type: 'image/jpeg' });
    expect(await readExifProof(file)).toEqual({ capturedAt: null, ...noLocation });
  });

  it('F2/F3: a file that cannot be read does not throw: no captured_at and no location', async () => {
    const file = new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])], { type: 'image/jpeg' });
    expect(await readExifProof(file)).toEqual({ capturedAt: null, ...noLocation });
  });
});

describe('location from EXIF', () => {
  it('F3: GPS with GPSHPositioningError gives latitude, longitude and accuracy', async () => {
    const file = jpegBlob({ gps: { latitude: -23.5613, longitude: -46.6565, hPositioningError: 4.5 } });
    const proof = await readExifProof(file);
    expect(proof.latitude).toBeCloseTo(-23.5613, 6);
    expect(proof.longitude).toBeCloseTo(-46.6565, 6);
    expect(proof.accuracyM).toBe(4.5);
  });

  it('F3: GPS without GPSHPositioningError has accuracy null', async () => {
    const proof = await readExifProof(jpegBlob({ gps: { latitude: 40.7, longitude: -74.0 } }));
    expect(proof.latitude).toBeCloseTo(40.7, 6);
    expect(proof.longitude).toBeCloseTo(-74.0, 6);
    expect(proof.accuracyM).toBeNull();
  });

  it('F3: latitude without longitude (or the reverse) gives no location at all', async () => {
    expect(await readExifProof(jpegBlob({ gps: { latitude: -23.5, hPositioningError: 5 } }))).toMatchObject(noLocation);
    expect(await readExifProof(jpegBlob({ gps: { longitude: -46.6, hPositioningError: 5 } }))).toMatchObject(
      noLocation,
    );
  });

  it('F3: coordinates out of range give no location at all', async () => {
    expect(await readExifProof(jpegBlob({ gps: { latitude: 95, longitude: 10, hPositioningError: 5 } }))).toMatchObject(
      noLocation,
    );
    expect(await readExifProof(jpegBlob({ gps: { latitude: 10, longitude: 190 } }))).toMatchObject(noLocation);
  });
});
