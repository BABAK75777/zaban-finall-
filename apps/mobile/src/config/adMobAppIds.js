/** CommonJS helper for app.config.js (Metro cannot load TypeScript config modules). */

const production = require('./adMobProduction');

const ADMOB_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

function useProductionAdUnits() {
  return process.env.EXPO_PUBLIC_ADMOB_USE_PRODUCTION_IDS === '1';
}

function preferTestAppIds() {
  // Match runtime banner selection: production App ID for store/release builds.
  // Opt into Google sample App IDs only via explicit test/validation flags.
  if (useProductionAdUnits()) return false;
  return (
    process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS === '1' ||
    process.env.EXPO_PUBLIC_USE_TEST_ADS === 'true' ||
    process.env.EXPO_PUBLIC_VALIDATION_BUILD === '1'
  );
}

function resolveAdMobAppIds() {
  const envAndroid = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim();
  const envIos = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim();

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

module.exports = {
  ADMOB_TEST_ANDROID_APP_ID,
  ADMOB_TEST_IOS_APP_ID,
  resolveAdMobAppIds,
};
