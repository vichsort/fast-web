import { executionAlerts, photoAlerts } from './alerts';

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

describe('execution alerts', () => {
  const noDue = { dueAt: null };
  const rejected = (reviewedAt: string) => ({ reviewStatus: 'rejected' as const, reviewedAt });

  it('F7: attempt submitted on the device before the previous rejection gets submitted_before_rejection', () => {
    const attempt = { clientSubmittedAt: '2026-11-06T13:00:00Z', receivedAt: '2026-11-06T15:00:00Z' };
    expect(executionAlerts(attempt, noDue, [rejected('2026-11-06T14:00:00Z')])).toEqual(['submitted_before_rejection']);
  });

  it('F7: attempt submitted after the previous rejection has no alert', () => {
    const attempt = { clientSubmittedAt: '2026-11-06T14:30:00Z', receivedAt: '2026-11-06T15:00:00Z' };
    expect(executionAlerts(attempt, noDue, [rejected('2026-11-06T14:00:00Z')])).toEqual([]);
  });

  it('F7: the previous rejection is the latest one reviewed before the attempt was received', () => {
    const attempt = { clientSubmittedAt: '2026-11-06T12:00:00Z', receivedAt: '2026-11-06T13:00:00Z' };
    const attempts = [
      rejected('2026-11-06T10:00:00Z'),
      rejected('2026-11-06T11:00:00Z'),
      // rejeição desta própria tentativa, depois de ela chegar: não é a anterior
      rejected('2026-11-06T16:00:00Z'),
    ];
    expect(executionAlerts(attempt, noDue, attempts)).toEqual([]);
    expect(executionAlerts({ ...attempt, clientSubmittedAt: '2026-11-06T10:30:00Z' }, noDue, attempts)).toEqual([
      'submitted_before_rejection',
    ]);
  });

  it('F7: attempt not received yet compares with the latest rejection', () => {
    const attempt = { clientSubmittedAt: '2026-11-06T12:00:00Z', receivedAt: null };
    expect(executionAlerts(attempt, noDue, [rejected('2026-11-06T13:00:00Z')])).toEqual(['submitted_before_rejection']);
  });

  it('F7: only rejections count as the previous rejection', () => {
    const attempt = { clientSubmittedAt: '2026-11-06T12:00:00Z', receivedAt: '2026-11-06T15:00:00Z' };
    const attempts = [
      { reviewStatus: 'approved' as const, reviewedAt: '2026-11-06T13:00:00Z' },
      { reviewStatus: 'voided' as const, reviewedAt: '2026-11-06T13:00:00Z' },
      { reviewStatus: 'pending' as const, reviewedAt: null },
      { reviewStatus: null, reviewedAt: null },
    ];
    expect(executionAlerts(attempt, noDue, attempts)).toEqual([]);
  });

  it('F7: attempt submitted after due_at gets late_delivery', () => {
    const attempt = { clientSubmittedAt: '2026-11-07T03:00:00Z', receivedAt: null };
    expect(executionAlerts(attempt, { dueAt: '2026-11-07T02:59:59.999Z' }, [])).toEqual(['late_delivery']);
    expect(executionAlerts(attempt, { dueAt: '2026-11-07T03:00:00Z' }, [])).toEqual([]);
  });

  it('F7: without due_at there is never late_delivery', () => {
    expect(executionAlerts({ clientSubmittedAt: '2030-01-01T00:00:00Z', receivedAt: null }, noDue, [])).toEqual([]);
  });

  it('F7: both execution alerts can show together', () => {
    const attempt = { clientSubmittedAt: '2026-11-08T12:00:00Z', receivedAt: '2026-11-08T15:00:00Z' };
    expect(executionAlerts(attempt, { dueAt: '2026-11-07T02:59:59Z' }, [rejected('2026-11-08T13:00:00Z')])).toEqual([
      'submitted_before_rejection',
      'late_delivery',
    ]);
  });
});
