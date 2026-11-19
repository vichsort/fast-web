import { buildVersion, isBelowMinimum, versionNumber } from './version';

describe('app version', () => {
  it('is the build time in UTC, YYYY.MM.DD.HHmm, with the commit after a +', () => {
    expect(buildVersion(new Date('2026-03-04T05:06:59Z'), 'abc1234')).toBe('2026.03.04.0506+abc1234');
  });

  it('has no commit part when the build has no git', () => {
    expect(buildVersion(new Date('2026-11-19T15:30:00Z'), null)).toBe('2026.11.19.1530');
  });

  it('compares by the number only, the format of app_settings.min_client_version', () => {
    expect(versionNumber('2026.11.19.1530+abc1234')).toBe('2026.11.19.1530');
  });

  it('is below the minimum only when older', () => {
    expect(isBelowMinimum('2026.11.19.1530+abc1234', '2026.11.19.1531')).toBe(true);
    expect(isBelowMinimum('2026.11.19.1530+abc1234', '2026.11.19.1530')).toBe(false);
    expect(isBelowMinimum('2026.11.19.1530', '0000.00.00.0000')).toBe(false);
    expect(isBelowMinimum('2026.12.01.0000', '2026.11.30.2359')).toBe(false);
  });
});
