/**
 * Mamlio production AdMob IDs (Babak Works).
 * Single source of truth for Android App ID (~) and Banner unit ID (/).
 * Used for release/store builds unless EXPO_PUBLIC_ADMOB_USE_TEST_IDS (or related test flags) is set.
 * Do not import this from UI components — use ../config/adMob helpers instead.
 * Do not change iOS placeholders in this Android-focused update.
 */
module.exports = {
  androidAppId: 'ca-app-pub-1237555604477660~8905708173',
  androidBannerUnitId: 'ca-app-pub-1237555604477660/7026750373',
  /** Set EXPO_PUBLIC_ADMOB_IOS_APP_ID when iOS ships. */
  iosAppId: null,
  iosBannerUnitId: null,
};
