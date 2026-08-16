import {
  areAdsEnabled,
  getBannerAdUnitId,
  getBannerAdUnitMode,
  PRODUCTION_BANNER_AD_UNIT_ID,
  ADMOB_TEST_ANDROID_BANNER_UNIT_ID,
  resolveAdMobAppIds,
} from '../src/config/adMob';

const NEW_ANDROID_APP_ID = 'ca-app-pub-1237555604477660~8905708173';
const NEW_ANDROID_BANNER_ID = 'ca-app-pub-1237555604477660/7026750373';
const OLD_ANDROID_APP_ID = 'ca-app-pub-2133767058275325~4482095081';
const OLD_ANDROID_BANNER_ID = 'ca-app-pub-2133767058275325/7034060635';
const GOOGLE_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const GOOGLE_TEST_BANNER_ID = 'ca-app-pub-3940256099942544/9214589741';

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
    delete process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID;
    delete process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('central production IDs match the current Mamlio Android AdMob account', () => {
    expect(PRODUCTION_BANNER_AD_UNIT_ID).toBe(NEW_ANDROID_BANNER_ID);
    expect(resolveAdMobAppIds().androidAppId).toBe(NEW_ANDROID_APP_ID);
    expect(PRODUCTION_BANNER_AD_UNIT_ID).not.toBe(OLD_ANDROID_BANNER_ID);
    expect(resolveAdMobAppIds().androidAppId).not.toBe(OLD_ANDROID_APP_ID);
    expect(resolveAdMobAppIds().androidAppId).not.toBe(GOOGLE_SAMPLE_APP_ID);
  });

  it('Test 1 — dev build uses production unit (no Google Test Ad watermark)', () => {
    const unitId = getBannerAdUnitId({ dev: true, platform: 'android' });
    expect(unitId).toBe(PRODUCTION_BANNER_AD_UNIT_ID);
    expect(unitId).not.toBe(GOOGLE_TEST_BANNER_ID);
    expect(getBannerAdUnitMode({ dev: true, platform: 'android' })).toBe('production');
  });

  it('Test 2 — explicit test env uses test ad unit', () => {
    process.env.EXPO_PUBLIC_USE_TEST_ADS = 'true';
    const unitId = getBannerAdUnitId({ dev: false, platform: 'android' });
    expect(unitId).toBe(GOOGLE_TEST_BANNER_ID);
    expect(unitId).not.toBe(PRODUCTION_BANNER_AD_UNIT_ID);
    expect(getBannerAdUnitMode({ dev: false, platform: 'android' })).toBe('test');
  });

  it('Test 3 — production mode keeps production unit in release and debug', () => {
    process.env.EXPO_PUBLIC_ADMOB_USE_PRODUCTION_IDS = '1';
    process.env.EXPO_PUBLIC_USE_TEST_ADS = 'false';
    expect(getBannerAdUnitId({ dev: false, platform: 'android' })).toBe(
      PRODUCTION_BANNER_AD_UNIT_ID
    );
    expect(getBannerAdUnitMode({ dev: false, platform: 'android' })).toBe('production');
    expect(getBannerAdUnitId({ dev: true, platform: 'android' })).toBe(
      PRODUCTION_BANNER_AD_UNIT_ID
    );
  });

  it('uses production banner on release builds by default', () => {
    expect(getBannerAdUnitId({ dev: false, platform: 'android' })).toBe(
      NEW_ANDROID_BANNER_ID
    );
    expect(getBannerAdUnitMode({ dev: false, platform: 'android' })).toBe('production');
  });

  it('disables ads during validation builds', () => {
    process.env.EXPO_PUBLIC_VALIDATION_BUILD = '1';
    expect(areAdsEnabled()).toBe(false);
  });

  it('keeps the ad banner enabled in debug (watermark fixed via production unit)', () => {
    expect(areAdsEnabled({ dev: true, platform: 'android' })).toBe(true);
    expect(areAdsEnabled({ dev: true, platform: 'ios' })).toBe(true);
  });

  it('keeps ads enabled when explicit test-ad mode is on (banner still shows)', () => {
    process.env.EXPO_PUBLIC_USE_TEST_ADS = 'true';
    expect(areAdsEnabled({ dev: false, platform: 'android' })).toBe(true);
    expect(areAdsEnabled({ dev: false, platform: 'ios' })).toBe(true);
  });

  it('enables ads on release builds with production units', () => {
    expect(areAdsEnabled({ dev: false, platform: 'android' })).toBe(true);
    expect(areAdsEnabled({ dev: false, platform: 'ios' })).toBe(true);
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
    expect(getBannerAdUnitId({ dev: false, platform: 'android' })).toBe(GOOGLE_TEST_BANNER_ID);
  });
});
