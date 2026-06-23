import { areAdsEnabled, resolveBannerAdUnitId } from '../src/config/adMob';
import { TestIds } from 'react-native-google-mobile-ads';

describe('adMob config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_VALIDATION_BUILD;
    delete process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID;
    delete process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses Google test banner unit in __DEV__', () => {
    expect(resolveBannerAdUnitId()).toBe(TestIds.ADAPTIVE_BANNER);
  });

  it('disables ads during validation builds', () => {
    process.env.EXPO_PUBLIC_VALIDATION_BUILD = '1';
    expect(areAdsEnabled()).toBe(false);
  });

  it('uses production Android banner unit in release when configured', () => {
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID = 'ca-app-pub-prod/111';
    expect(resolveBannerAdUnitId({ dev: false, platform: 'android' })).toBe('ca-app-pub-prod/111');
  });
});
