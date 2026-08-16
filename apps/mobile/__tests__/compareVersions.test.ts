import { compareVersions, isUpdateAvailable, parseVersionSegments } from '../src/update/compareVersions';

describe('compareVersions', () => {
  it('parses semver segments', () => {
    expect(parseVersionSegments('1.2.0')).toEqual([1, 2, 0]);
    expect(parseVersionSegments('1.2')).toEqual([1, 2]);
  });

  it('treats latest higher patch as update available', () => {
    expect(isUpdateAvailable('1.2.0', '1.2.1')).toBe(true);
    expect(compareVersions('1.2.0', '1.2.1')).toBeLessThan(0);
  });

  it('treats same version as not available', () => {
    expect(isUpdateAvailable('1.2.0', '1.2.0')).toBe(false);
    expect(isUpdateAvailable('1.2', '1.2.0')).toBe(false);
  });

  it('treats current higher as not available', () => {
    expect(isUpdateAvailable('1.3.0', '1.2.9')).toBe(false);
    expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
  });

  it('compares 1.10 greater than 1.2 numerically', () => {
    expect(isUpdateAvailable('1.2.0', '1.10.0')).toBe(true);
    expect(compareVersions('1.10.0', '1.2.0')).toBeGreaterThan(0);
  });
});
