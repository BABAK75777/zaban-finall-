import { getAppVersionLabel } from '../src/config/appVersion';

describe('getAppVersionLabel', () => {
  it('formats version display as Mamlio v1.2.1', () => {
    expect(getAppVersionLabel('1.2.1')).toBe('Mamlio v1.2.1');
  });

  it('uses provided version string', () => {
    expect(getAppVersionLabel('1.2.3')).toBe('Mamlio v1.2.3');
  });

  it('defaults to package.json version', () => {
    expect(getAppVersionLabel()).toBe('Mamlio v1.3.2');
  });
});
