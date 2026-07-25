import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import {
  AD_BANNER_BLEND_HEIGHT,
  AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
  AD_BANNER_SLOT_HEIGHT,
  AD_BANNER_TYPE,
  getResolvedBannerReservedHeight,
} from '../ads/adBannerLayout';
import { initializeAdMob } from '../ads/initializeAdMob';
import { useAdsConsent } from '../ads/useAdsConsent';
import {
  areAdsEnabled,
  getBannerAdUnitId,
  getBannerAdUnitMode,
} from '../config/adMob';
import { getTheme } from '../theme/themes';
import type { ThemeId } from '../theme/themeTypes';
import { READING_TEST_IDS } from '../ui/testIds';

export {
  AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
  AD_BANNER_SLOT_HEIGHT,
  getAdBannerReservedHeight,
  getResolvedBannerReservedHeight,
} from '../ads/adBannerLayout';

export type AdBannerProps = {
  /**
   * @deprecated Busy state no longer hides the banner. Used for layout logs only.
   */
  interactionSafeForAds?: boolean;
  /**
   * @deprecated Use interactionSafeForAds. Kept for callers that still pass enabled.
   */
  enabled?: boolean;
  busyStateSummary?: string;
  /** Vertical gap between controls above and the banner (logged for layout audit). */
  safeDistanceFromControls?: number;
  testID?: string;
  contentTestID?: string;
  reservedSlotTestID?: string;
  /** App theme — styles the reserved footer slot (not the AdMob creative). */
  themeId?: ThemeId;
  /** Reading-screen background — blends the ad footer into the page. Overrides theme bg when set. */
  backgroundColor?: string;
  /**
   * Keep footer height on screens that support ads. Defaults to areAdsEnabled().
   * Set false on screens that never show ads.
   */
  reserveSpace?: boolean;
};

function BannerBackgroundBlend({ color }: { color: string }) {
  const stepHeight = AD_BANNER_BLEND_HEIGHT / 12;
  return (
    <View style={styles.blend} pointerEvents="none">
      {Array.from({ length: 12 }, (_, index) => (
        <View
          key={index}
          style={{
            height: stepHeight,
            backgroundColor: color,
            opacity: (index + 1) / 12,
          }}
        />
      ))}
    </View>
  );
}

function logAdBanner(message: string): void {
  console.log(`[AdBanner] ${message}`);
}

function resolveFooterBackground(
  themeId: ThemeId | undefined,
  backgroundColor?: string
): string {
  if (backgroundColor) return backgroundColor;
  if (themeId) return getTheme(themeId).adSlotBackground;
  return 'transparent';
}

function resolveReservedSlotReason(input: {
  adsEnabledByConfig: boolean;
  consentReady: boolean;
  consentAllowsAds: boolean;
  sdkReady: boolean;
  adFailed: boolean;
}): string {
  if (!input.adsEnabledByConfig) {
    return 'ads_disabled';
  }
  if (!input.consentReady) {
    return 'consent_not_ready';
  }
  if (!input.consentAllowsAds) {
    return 'consent_disallows_ads';
  }
  if (!input.sdkReady) {
    return 'sdk_not_ready';
  }
  if (input.adFailed) {
    return 'load_failed';
  }
  return 'waiting';
}

function AdBannerComponent({
  interactionSafeForAds,
  enabled = true,
  busyStateSummary = 'none',
  safeDistanceFromControls = AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
  testID = READING_TEST_IDS.adBanner,
  contentTestID = READING_TEST_IDS.adBannerContent,
  reservedSlotTestID = READING_TEST_IDS.adBannerReservedSlot,
  themeId = 'dark',
  backgroundColor,
  reserveSpace,
}: AdBannerProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [adFailed, setAdFailed] = useState(false);
  const [adLoadKey, setAdLoadKey] = useState(0);
  const adRetryCountRef = useRef(0);
  const adRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLayoutLogRef = useRef<string | null>(null);
  const adUnitModeLoggedRef = useRef(false);

  const { consentReady, consentAllowsAds, consentStatus } = useAdsConsent();
  const isAppBusy = (interactionSafeForAds ?? enabled) === false;
  const adsEnabledByConfig = areAdsEnabled();
  const shouldReserve = reserveSpace ?? adsEnabledByConfig;
  const footerBg = resolveFooterBackground(themeId, backgroundColor);
  const includeBlend = Boolean(backgroundColor);
  const reservedHeight = getResolvedBannerReservedHeight({ includeBlend });
  const bannerAdUnitId = useMemo(() => getBannerAdUnitId(), []);
  const shouldShowRealBanner =
    adsEnabledByConfig && sdkReady && !adFailed && consentAllowsAds;

  useEffect(() => {
    if (!adsEnabledByConfig || !consentAllowsAds) {
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
  }, [adsEnabledByConfig, consentAllowsAds]);

  useEffect(() => {
    return () => {
      if (adRetryTimerRef.current) {
        clearTimeout(adRetryTimerRef.current);
      }
    };
  }, []);

  const scheduleAdRetry = () => {
    if (adRetryCountRef.current >= 3) {
      setAdFailed(true);
      return;
    }
    adRetryCountRef.current += 1;
    const delayMs = 1500 * adRetryCountRef.current;
    adRetryTimerRef.current = setTimeout(() => {
      setAdLoadKey((key) => key + 1);
    }, delayMs);
  };

  useEffect(() => {
    if (!shouldReserve || adUnitModeLoggedRef.current) {
      return;
    }

    adUnitModeLoggedRef.current = true;
    logAdBanner(`adUnitMode=${getBannerAdUnitMode()}`);
  }, [shouldReserve]);

  useEffect(() => {
    if (!shouldReserve) {
      return;
    }

    const reservedReason = shouldShowRealBanner
      ? 'real_banner'
      : resolveReservedSlotReason({
          adsEnabledByConfig,
          consentReady,
          consentAllowsAds,
          sdkReady,
          adFailed,
        });

    const layoutKey = [
      shouldShowRealBanner,
      adsEnabledByConfig,
      sdkReady,
      adFailed,
      consentReady,
      consentAllowsAds,
      consentStatus,
      safeDistanceFromControls,
      isAppBusy,
      busyStateSummary,
      themeId,
      footerBg,
      reservedHeight,
      reservedReason,
    ].join('|');

    if (prevLayoutLogRef.current === layoutKey) {
      return;
    }

    prevLayoutLogRef.current = layoutKey;
    logAdBanner(
      `render adsAllowed=${adsEnabledByConfig} sdkReady=${sdkReady} consentAllowsAds=${consentAllowsAds} failed=${adFailed} busy=${isAppBusy}`
    );
    logAdBanner(`consent status=${consentStatus}`);
    logAdBanner(
      `adsAllowed=${shouldShowRealBanner} reason=${
        shouldShowRealBanner
          ? 'ready'
          : resolveReservedSlotReason({
              adsEnabledByConfig,
              consentReady,
              consentAllowsAds,
              sdkReady,
              adFailed,
            })
      }`
    );
    logAdBanner(`theme=${themeId} background=${footerBg}`);
    logAdBanner(`bannerType=${AD_BANNER_TYPE}`);
    logAdBanner(`reservedHeight=${reservedHeight}`);
    if (shouldShowRealBanner) {
      logAdBanner('show real banner');
    } else {
      logAdBanner(
        `show themed reserved slot reason=${resolveReservedSlotReason({
          adsEnabledByConfig,
          consentReady,
          consentAllowsAds,
          sdkReady,
          adFailed,
        })}`
      );
    }
  }, [
    adFailed,
    adsEnabledByConfig,
    busyStateSummary,
    consentAllowsAds,
    consentReady,
    consentStatus,
    footerBg,
    isAppBusy,
    reservedHeight,
    safeDistanceFromControls,
    sdkReady,
    shouldReserve,
    shouldShowRealBanner,
    themeId,
  ]);

  if (!shouldReserve) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          minHeight: reservedHeight,
          backgroundColor: footerBg,
        },
      ]}
      testID={testID}
    >
      {includeBlend ? <BannerBackgroundBlend color={footerBg} /> : null}
      <View style={[styles.slot, { height: AD_BANNER_SLOT_HEIGHT, backgroundColor: footerBg }]}>
        {shouldShowRealBanner ? (
          <View style={styles.adContent} testID={contentTestID}>
            <BannerAd
              key={adLoadKey}
              unitId={bannerAdUnitId}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{
                requestNonPersonalizedAdsOnly: false,
              }}
              onAdLoaded={() => {
                adRetryCountRef.current = 0;
                setAdFailed(false);
                logAdBanner('loaded');
              }}
              onAdFailedToLoad={(error) => {
                logAdBanner(`failed error=${error?.message ?? 'unknown'}`);
                scheduleAdRetry();
              }}
            />
          </View>
        ) : (
          <View
            style={[
              styles.emptyThemedSlot,
              { minHeight: AD_BANNER_SLOT_HEIGHT, backgroundColor: footerBg },
            ]}
            testID={reservedSlotTestID}
          />
        )}
      </View>
    </View>
  );
}

/**
 * Anchored adaptive banner for safe screen footers (Home / Settings).
 * Always reserves fixed footer height; busy states do not hide a loaded banner.
 * Accidental clicks are prevented by layout spacing above the banner — never by
 * blocking touches on the AdMob view.
 */
export const AdBanner = memo(AdBannerComponent);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  blend: {
    width: '100%',
    height: AD_BANNER_BLEND_HEIGHT,
    overflow: 'hidden',
  },
  slot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  adContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyThemedSlot: {
    width: '100%',
    height: '100%',
  },
});
