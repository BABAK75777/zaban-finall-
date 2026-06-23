import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** Google sample App IDs — used in app.config.js when env vars are unset. */
export const ADMOB_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const ADMOB_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

export type AdMobRuntimeOptions = {
  /** Override __DEV__ (used by unit tests). */
  dev?: boolean;
  platform?: typeof Platform.OS;
};

function readExpoEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

/**
 * Production banner unit IDs (set in EAS / .env for release builds):
 *   EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID=ca-app-pub-XXXX/YYYY
 *   EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID=ca-app-pub-XXXX/YYYY
 *
 * Production App IDs (native config — rebuild required after change):
 *   EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXX~YYYY
 *   EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-XXXX~YYYY
 */
export function resolveAdMobAppIds(): { androidAppId: string; iosAppId: string } {
  return {
    androidAppId: readExpoEnv('EXPO_PUBLIC_ADMOB_ANDROID_APP_ID') || ADMOB_TEST_ANDROID_APP_ID,
    iosAppId: readExpoEnv('EXPO_PUBLIC_ADMOB_IOS_APP_ID') || ADMOB_TEST_IOS_APP_ID,
  };
}

export function resolveBannerAdUnitId(options: AdMobRuntimeOptions = {}): string {
  const isDev = options.dev ?? __DEV__;
  if (isDev) {
    return TestIds.ADAPTIVE_BANNER;
  }

  const platform = options.platform ?? Platform.OS;
  const production =
    platform === 'ios'
      ? readExpoEnv('EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID')
      : readExpoEnv('EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID');

  if (production) {
    return production;
  }

  return TestIds.ADAPTIVE_BANNER;
}

/**
 * Global ad visibility gate.
 * - Disabled during validation/E2E builds.
 * - Future Premium: return false when user.hasPremium === true.
 */
export function areAdsEnabled(): boolean {
  if (readExpoEnv('EXPO_PUBLIC_VALIDATION_BUILD') === '1') {
    return false;
  }
  // Future Premium gate:
  // if (getPremiumStatus()?.active) return false;
  return true;
}
