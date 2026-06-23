import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initializeAdMob } from '../ads/initializeAdMob';
import { areAdsEnabled, resolveBannerAdUnitId } from '../config/adMob';
import { READING_TEST_IDS } from '../ui/testIds';

const FADE_STEPS = 12;
const FADE_HEIGHT = 18;

export type AdBannerProps = {
  /**
   * Pass false to hide the banner without unmounting the parent screen.
   * Future Premium: set enabled={!user.isPremium}.
   */
  enabled?: boolean;
  testID?: string;
  /** Reading-screen background — blends the ad footer into the page. */
  backgroundColor?: string;
};

function BannerBackgroundBlend({ color }: { color: string }) {
  const stepHeight = FADE_HEIGHT / FADE_STEPS;
  return (
    <View style={styles.blend} pointerEvents="none">
      {Array.from({ length: FADE_STEPS }, (_, index) => (
        <View
          key={index}
          style={{
            height: stepHeight,
            backgroundColor: color,
            opacity: (index + 1) / FADE_STEPS,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Small anchored adaptive banner for screen footers (Home / Reading).
 * Renders nothing when ads are disabled, SDK init fails, or the ad fails to load.
 */
export function AdBanner({
  enabled = true,
  testID = READING_TEST_IDS.adBanner,
  backgroundColor,
}: AdBannerProps) {
  const insets = useSafeAreaInsets();
  const [sdkReady, setSdkReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const shouldAttempt = enabled && areAdsEnabled();

  useEffect(() => {
    if (!shouldAttempt) {
      return;
    }

    let cancelled = false;
    void initializeAdMob().then((ok) => {
      if (!cancelled && ok) {
        setSdkReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shouldAttempt]);

  if (!shouldAttempt || !sdkReady || failed) {
    return null;
  }

  const footerBg = backgroundColor ?? 'transparent';

  return (
    <View
      style={[styles.wrap, { backgroundColor: footerBg, paddingBottom: Math.max(insets.bottom, 0) }]}
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {backgroundColor ? <BannerBackgroundBlend color={backgroundColor} /> : null}
      <View style={[styles.slot, { backgroundColor: footerBg }]}>
        <BannerAd
          unitId={resolveBannerAdUnitId()}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdFailedToLoad={(error) => {
            console.warn('[AdMob] Banner failed to load:', error);
            setFailed(true);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  blend: {
    width: '100%',
    height: FADE_HEIGHT,
    overflow: 'hidden',
  },
  slot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
