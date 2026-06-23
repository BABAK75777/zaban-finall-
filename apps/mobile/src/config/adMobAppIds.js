/** CommonJS helper for app.config.js (Metro cannot load TypeScript config modules). */

const ADMOB_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

function resolveAdMobAppIds() {
  return {
    androidAppId:
      process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim() || ADMOB_TEST_ANDROID_APP_ID,
    iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim() || ADMOB_TEST_IOS_APP_ID,
  };
}

module.exports = {
  ADMOB_TEST_ANDROID_APP_ID,
  ADMOB_TEST_IOS_APP_ID,
  resolveAdMobAppIds,
};
