import { photoAlerts } from './alerts';

const started = { clientStartedAt: '2026-11-06T13:00:00Z' };

describe('photo alerts', () => {
  it('F7: gallery photo without captured_at gets gallery_without_exif', () => {
    expect(photoAlerts({ source: 'gallery', capturedAt: null }, started)).toEqual(['gallery_without_exif']);
  });

  it('F7: gallery photo taken before the execution started gets gallery_before_start', () => {
    expect(photoAlerts({ source: 'gallery', capturedAt: '2026-11-06T12:59:59Z' }, started)).toEqual([
      'gallery_before_start',
    ]);
  });

  it('F7: gallery photo compares instants, not the text of the offsets', () => {
    expect(photoAlerts({ source: 'gallery', capturedAt: '2026-11-06T09:59:00-03:00' }, started)).toEqual([
      'gallery_before_start',
    ]);
    expect(photoAlerts({ source: 'gallery', capturedAt: '2026-11-06T10:00:00-03:00' }, started)).toEqual([]);
  });

  it('F7: gallery photo taken after the start has no alert', () => {
    expect(photoAlerts({ source: 'gallery', capturedAt: '2026-11-06T13:05:00Z' }, started)).toEqual([]);
  });

  it('F7: without client_started_at, gallery_before_start is not evaluated', () => {
    expect(photoAlerts({ source: 'gallery', capturedAt: '2020-01-01T00:00:00Z' }, { clientStartedAt: null })).toEqual(
      [],
    );
    expect(photoAlerts({ source: 'gallery', capturedAt: null }, { clientStartedAt: null })).toEqual([
      'gallery_without_exif',
    ]);
  });

  it('F7: camera photos never get photo alerts', () => {
    expect(photoAlerts({ source: 'camera', capturedAt: null }, started)).toEqual([]);
    expect(photoAlerts({ source: 'camera', capturedAt: '2020-01-01T00:00:00Z' }, started)).toEqual([]);
  });
});
