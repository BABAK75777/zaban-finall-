import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const production = require('./adMobProduction.js') as {
  androidAppId: string;
  androidBannerUnitId: string;
  iosAppId: string | null;
  iosBannerUnitId: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const testUnits = require('./adMobTest.js') as {
  androidBannerUnitId: string;
  iosBannerUnitId: string;
};

export const PRODUCTION_BANNER_AD_UNIT_ID = production.androidBannerUnitId;

/** Google sample App IDs — used unless production native IDs are explicitly enabled. */
export const ADMOB_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const ADMOB_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

/** Google sample banner units — used only when test ads are explicitly requested. */
export const ADMOB_TEST_ANDROID_BANNER_UNIT_ID = testUnits.androidBannerUnitId;
export const ADMOB_TEST_IOS_BANNER_UNIT_ID = testUnits.iosBannerUnitId;

export type AdMobRuntimeOptions = {
  /** Override __DEV__ (used by unit tests). */
  dev?: boolean;
  platform?: typeof Platform.OS;
};

function readExpoEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

/**
 * Production banner unit IDs:
 *   EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID=ca-app-pub-XXXX/YYYY  (optional override)
 *   EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID=ca-app-pub-XXXX/YYYY
 *
 * Force Google sample "Test Ad" creatives (shows Test Ad / Test mode badge):
 *   EXPO_PUBLIC_USE_TEST_ADS=true
 *   EXPO_PUBLIC_ADMOB_USE_TEST_IDS=1
 *
 * Production App IDs (native config — rebuild required after change):
 *   EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXX~YYYY
 *   EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-XXXX~YYYY
 */
function useProductionAdUnits(): boolean {
  return readExpoEnv('EXPO_PUBLIC_ADMOB_USE_PRODUCTION_IDS') === '1';
}

function preferTestAppIds(): boolean {
  if (useProductionAdUnits()) return false;
  return (
    readExpoEnv('EXPO_PUBLIC_ADMOB_USE_TEST_IDS') === '1' ||
    readExpoEnv('EXPO_PUBLIC_USE_TEST_ADS') === 'true' ||
    readExpoEnv('EXPO_PUBLIC_VALIDATION_BUILD') === '1'
  );
}

function resolveTestBannerUnitId(platform: typeof Platform.OS): string {
  return platform === 'ios' ? TestIds.BANNER : TestIds.ADAPTIVE_BANNER;
}

function resolveLegacyTestBannerUnitId(platform: typeof Platform.OS): string {
  return platform === 'ios'
    ? ADMOB_TEST_IOS_BANNER_UNIT_ID
    : ADMOB_TEST_ANDROID_BANNER_UNIT_ID;
}

export function resolveAdMobAppIds(): { androidAppId: string; iosAppId: string } {
  const envAndroid = readExpoEnv('EXPO_PUBLIC_ADMOB_ANDROID_APP_ID');
  const envIos = readExpoEnv('EXPO_PUBLIC_ADMOB_IOS_APP_ID');

  if (envAndroid || envIos) {
    return {
      androidAppId: envAndroid || production.androidAppId,
      iosAppId: envIos || production.iosAppId || ADMOB_TEST_IOS_APP_ID,
    };
  }

  if (preferTestAppIds()) {
    return {
      androidAppId: ADMOB_TEST_ANDROID_APP_ID,
      iosAppId: ADMOB_TEST_IOS_APP_ID,
    };
  }

  return {
    androidAppId: production.androidAppId,
    iosAppId: production.iosAppId || ADMOB_TEST_IOS_APP_ID,
  };
}

/**
 * Google sample test units always paint a "Test Ad" / "Test mode" badge into the
 * creative — that badge cannot be stripped in app UI. Only use those units when
 * explicitly requested; otherwise use production units so the ad shows without
 * the watermark (including debug installs).
 */
export function shouldUseTestBannerAds(_options: AdMobRuntimeOptions = {}): boolean {
  if (readExpoEnv('EXPO_PUBLIC_ADMOB_USE_TEST_IDS') === '1') return true;
  if (readExpoEnv('EXPO_PUBLIC_USE_TEST_ADS') === 'true') return true;
  if (readExpoEnv('EXPO_PUBLIC_VALIDATION_BUILD') === '1') return true;
  return false;
}

export function getBannerAdUnitMode(options: AdMobRuntimeOptions = {}): 'test' | 'production' {
  return shouldUseTestBannerAds(options) ? 'test' : 'production';
}

/**
 * Banner ad unit selection — production Mamlio units by default (no Test Ad badge).
 * Google sample test units only when EXPO_PUBLIC_USE_TEST_ADS / USE_TEST_IDS / validation.
 */
export function getBannerAdUnitId(options: AdMobRuntimeOptions = {}): string {
  const platform = options.platform ?? Platform.OS;

  if (shouldUseTestBannerAds(options)) {
    return resolveTestBannerUnitId(platform);
  }

  const envUnit =
    platform === 'ios'
      ? readExpoEnv('EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID')
      : readExpoEnv('EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID');

  if (envUnit) {
    return envUnit;
  }

  const configured =
    platform === 'ios' ? production.iosBannerUnitId : production.androidBannerUnitId;

  if (configured) {
    return configured;
  }

  return resolveLegacyTestBannerUnitId(platform);
}

export function resolveBannerAdUnitId(options: AdMobRuntimeOptions = {}): string {
  return getBannerAdUnitId(options);
}

/**
 * Global ad visibility gate (app config / premium / validation builds).
 * Consent is handled separately in adsConsent + AdBanner.
 */
export function areAdsEnabled(_options: AdMobRuntimeOptions = {}): boolean {
  if (readExpoEnv('EXPO_PUBLIC_VALIDATION_BUILD') === '1') {
    return false;
  }
  // Future Premium gate:
  // if (getPremiumStatus()?.active) return false;
  return true;
}
