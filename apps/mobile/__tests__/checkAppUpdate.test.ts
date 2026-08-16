import { checkAppUpdate } from '../src/update/checkAppUpdate';
import * as fetchUpdateConfigModule from '../src/update/fetchUpdateConfig';

describe('checkAppUpdate', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns update available when latest is higher', async () => {
    jest.spyOn(fetchUpdateConfigModule, 'fetchUpdateConfig').mockResolvedValue({
      latestVersion: '1.2.1',
      updateUrl: 'https://play.google.com/store/apps/details?id=com.babakworks.mamlio',
      message: 'A newer version of Mamlio is available.',
    });

    const result = await checkAppUpdate('1.2.0');
    expect(result.updateAvailable).toBe(true);
    if (result.updateAvailable) {
      expect(result.latestVersion).toBe('1.2.1');
      expect(result.prompt.updateUrl).toContain('play.google.com');
    }
  });

  it('returns false when versions match', async () => {
    jest.spyOn(fetchUpdateConfigModule, 'fetchUpdateConfig').mockResolvedValue({
      latestVersion: '1.2.0',
      updateUrl: 'https://example.com/update',
      message: 'Update',
    });

    const result = await checkAppUpdate('1.2.0');
    expect(result).toEqual({
      updateAvailable: false,
      currentVersion: '1.2.0',
      latestVersion: '1.2.0',
      reason: 'up-to-date',
    });
  });

  it('returns false when current is newer', async () => {
    jest.spyOn(fetchUpdateConfigModule, 'fetchUpdateConfig').mockResolvedValue({
      latestVersion: '1.1.0',
      updateUrl: 'https://example.com/update',
      message: 'Update',
    });

    const result = await checkAppUpdate('1.2.0');
    expect(result.updateAvailable).toBe(false);
    expect(result.reason).toBe('up-to-date');
  });

  it('does not block app when network fetch fails', async () => {
    jest.spyOn(fetchUpdateConfigModule, 'fetchUpdateConfig').mockResolvedValue(null);

    await expect(checkAppUpdate('1.2.0')).resolves.toEqual({
      updateAvailable: false,
      currentVersion: '1.2.0',
      reason: 'fetch-failed',
    });
  });
});
