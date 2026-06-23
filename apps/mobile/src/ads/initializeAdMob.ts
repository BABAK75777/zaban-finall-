import mobileAds from 'react-native-google-mobile-ads';

let initPromise: Promise<boolean> | null = null;

/**
 * Initializes the Google Mobile Ads SDK once per app session.
 * Never throws — callers receive false when initialization fails.
 */
export function initializeAdMob(): Promise<boolean> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await mobileAds().initialize();
      return true;
    } catch (error) {
      console.warn('[AdMob] SDK initialization failed:', error);
      return false;
    }
  })();

  return initPromise;
}
