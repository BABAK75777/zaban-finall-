import {
  areAdsEnabled,
  getBannerAdUnitId,
  getBannerAdUnitMode,
  PRODUCTION_BANNER_AD_UNIT_ID,
  ADMOB_TEST_ANDROID_BANNER_UNIT_ID,
} from '../src/config/adMob';

describe('adMob config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_VALIDATION_BUILD;
    delete process.env.EXPO_PUBLIC_ADMOB_USE_PRODUCTION_IDS;
    delete process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS;
    delete process.env.EXPO_PUBLIC_USE_TEST_ADS;
    delete process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID;
    delete process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('Test 1 — dev build uses test ad unit', () => {
    const unitId = getBannerAdUnitId({ dev: true, platform: 'android' });
    expect(unitId).toBe('ca-app-pub-3940256099942544/9214589741');
    expect(unitId).not.toBe(PRODUCTION_BANNER_AD_UNIT_ID);
    expect(getBannerAdUnitMode({ dev: true, platform: 'android' })).toBe('test');
  });

  it('Test 2 — explicit test env uses test ad unit', () => {
    process.env.EXPO_PUBLIC_USE_TEST_ADS = 'true';
    const unitId = getBannerAdUnitId({ dev: false, platform: 'android' });
    expect(unitId).toBe('ca-app-pub-3940256099942544/9214589741');
    expect(unitId).not.toBe(PRODUCTION_BANNER_AD_UNIT_ID);
    expect(getBannerAdUnitMode({ dev: false, platform: 'android' })).toBe('test');
  });

  it('Test 3 — production mode uses production ad unit only when allowed', () => {
    process.env.EXPO_PUBLIC_ADMOB_USE_PRODUCTION_IDS = '1';
    process.env.EXPO_PUBLIC_USE_TEST_ADS = 'false';
    expect(getBannerAdUnitId({ dev: false, platform: 'android' })).toBe(
      PRODUCTION_BANNER_AD_UNIT_ID
    );
    expect(getBannerAdUnitMode({ dev: false, platform: 'android' })).toBe('production');
    expect(getBannerAdUnitId({ dev: true, platform: 'android' })).not.toBe(
      PRODUCTION_BANNER_AD_UNIT_ID
    );
  });

  it('uses production banner on release builds by default', () => {
    expect(getBannerAdUnitId({ dev: false, platform: 'android' })).toBe(
      PRODUCTION_BANNER_AD_UNIT_ID
    );
    expect(getBannerAdUnitMode({ dev: false, platform: 'android' })).toBe('production');
  });

  it('disables ads during validation builds', () => {
    process.env.EXPO_PUBLIC_VALIDATION_BUILD = '1';
    expect(areAdsEnabled()).toBe(false);
  });

  it('uses env override for production Android banner unit', () => {
    process.env.EXPO_PUBLIC_ADMOB_USE_PRODUCTION_IDS = '1';
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID = 'ca-app-pub-prod/111';
    expect(getBannerAdUnitId({ dev: false, platform: 'android' })).toBe('ca-app-pub-prod/111');
  });

  it('uses env override for Android banner unit on release builds', () => {
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID = 'ca-app-pub-prod/111';
    expect(getBannerAdUnitId({ dev: false, platform: 'android' })).toBe('ca-app-pub-prod/111');
  });

  it('uses test banner when validation build flag is set even with production enabled', () => {
    process.env.EXPO_PUBLIC_ADMOB_USE_PRODUCTION_IDS = '1';
    process.env.EXPO_PUBLIC_VALIDATION_BUILD = '1';
    expect(getBannerAdUnitId({ dev: false, platform: 'android' })).toBe(
      'ca-app-pub-3940256099942544/9214589741'
    );
  });
});
