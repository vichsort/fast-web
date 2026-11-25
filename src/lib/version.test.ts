import { buildVersion, compareVersions, isBelowMinimum, versionNumber } from './version';

describe('app version (semver)', () => {
  it('is the package version with the commit after a +', () => {
    expect(buildVersion('1.4.2', 'abc1234')).toBe('1.4.2+abc1234');
  });

  it('has no commit part when the build has no git', () => {
    expect(buildVersion('0.0.0', null)).toBe('0.0.0');
  });

  it('compares by the number only, the format of app_settings.min_client_version', () => {
    expect(versionNumber('1.4.2+abc1234')).toBe('1.4.2');
  });

  it('compares number by number, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('0.9.9', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0+abc', '2.0.0')).toBe(0);
  });

  it('is below the minimum only when older', () => {
    expect(isBelowMinimum('1.9.3+abc1234', '1.10.0')).toBe(true);
    expect(isBelowMinimum('1.10.0+abc1234', '1.10.0')).toBe(false);
    expect(isBelowMinimum('0.0.0', '0.0.0')).toBe(false);
    expect(isBelowMinimum('2.0.0', '1.99.99')).toBe(false);
  });
});
