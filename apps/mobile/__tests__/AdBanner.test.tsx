import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import {
  AdBanner,
  getAdBannerReservedHeight,
  getResolvedBannerReservedHeight,
} from '../src/components/AdBanner';
import {
  AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
  AD_BANNER_SLOT_HEIGHT,
  AD_BANNER_TYPE,
} from '../src/ads/adBannerLayout';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { initializeAdMob } from '../src/ads/initializeAdMob';
import {
  areAdsEnabled,
  getBannerAdUnitId,
  getBannerAdUnitMode,
  PRODUCTION_BANNER_AD_UNIT_ID,
} from '../src/config/adMob';
import { getTheme } from '../src/theme/themes';
import type { ThemeId } from '../src/theme/themeTypes';
import { useAdsConsent } from '../src/ads/useAdsConsent';

jest.mock('../src/config/adMob', () => ({
  areAdsEnabled: jest.fn(() => true),
  getBannerAdUnitId: jest.fn(() => 'ca-app-pub-3940256099942544/9214589741'),
  getBannerAdUnitMode: jest.fn(() => 'test'),
  resolveBannerAdUnitId: jest.fn(() => 'ca-app-pub-3940256099942544/9214589741'),
  PRODUCTION_BANNER_AD_UNIT_ID: 'ca-app-pub-2133767058275325/7034060635',
}));

jest.mock('../src/ads/useAdsConsent', () => ({
  useAdsConsent: jest.fn(() => ({
    consentReady: true,
    consentAllowsAds: true,
    consentStatus: 'OBTAINED',
  })),
}));

function readStyle(getByTestId: (id: string) => unknown, testID: string): Record<string, unknown> {
  const node = getByTestId(testID) as { props: { style: object | object[] } };
  return Array.isArray(node.props.style)
    ? Object.assign({}, ...node.props.style)
    : (node.props.style as Record<string, unknown>);
}

function readReservedHeight(getByTestId: (id: string) => unknown, testID: string): number {
  const style = readStyle(getByTestId, testID);
  return (style.minHeight ?? style.height) as number;
}

function readBackground(getByTestId: (id: string) => unknown, testID: string): string {
  return readStyle(getByTestId, testID).backgroundColor as string;
}

describe('AdBanner', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_VALIDATION_BUILD = '0';
    jest.clearAllMocks();
    (areAdsEnabled as jest.Mock).mockReturnValue(true);
    (useAdsConsent as jest.Mock).mockReturnValue({
      consentReady: true,
      consentAllowsAds: true,
      consentStatus: 'OBTAINED',
    });
    (initializeAdMob as jest.Mock).mockResolvedValue(true);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('initializes AdMob when ads and consent are allowed', async () => {
    render(
      <TestSafeAreaProvider>
        <AdBanner />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(initializeAdMob).toHaveBeenCalledTimes(1);
    });
  });

  it('does not reserve space when ads are disabled for validation builds', () => {
    process.env.EXPO_PUBLIC_VALIDATION_BUILD = '1';
    (areAdsEnabled as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = render(
      <TestSafeAreaProvider>
        <AdBanner testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    expect(queryByTestId(READING_TEST_IDS.adBanner)).toBeNull();
    expect(initializeAdMob).not.toHaveBeenCalled();
  });

  it('Test 4 — consent not ready does not load real banner', async () => {
    (useAdsConsent as jest.Mock).mockReturnValue({
      consentReady: false,
      consentAllowsAds: false,
      consentStatus: 'UNKNOWN',
    });

    const { getByTestId, queryByTestId } = render(
      <TestSafeAreaProvider>
        <AdBanner themeId="light" testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByTestId(READING_TEST_IDS.adBannerReservedSlot)).toBeTruthy();
    });

    expect(queryByTestId('mock-google-banner-ad')).toBeNull();
    expect(readBackground(getByTestId, READING_TEST_IDS.adBannerReservedSlot)).toBe(
      getTheme('light').adSlotBackground
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('show themed reserved slot reason=consent_not_ready')
    );
  });

  it('Test 5 — consent disallows ads', async () => {
    (useAdsConsent as jest.Mock).mockReturnValue({
      consentReady: true,
      consentAllowsAds: false,
      consentStatus: 'REQUIRED',
    });

    const { getByTestId, queryByTestId } = render(
      <TestSafeAreaProvider>
        <AdBanner themeId="cream" testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByTestId(READING_TEST_IDS.adBannerReservedSlot)).toBeTruthy();
    });

    expect(queryByTestId('mock-google-banner-ad')).toBeNull();
    expect(initializeAdMob).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('show themed reserved slot reason=consent_disallows_ads')
    );
  });

  it('Test 6 — banner remains visible during busy state', async () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <TestSafeAreaProvider>
        <AdBanner interactionSafeForAds testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByTestId('mock-google-banner-ad')).toBeTruthy();
    });

    rerender(
      <TestSafeAreaProvider>
        <AdBanner interactionSafeForAds={false} testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    expect(queryByTestId('mock-google-banner-ad')).toBeTruthy();
    expect(queryByTestId(READING_TEST_IDS.adBannerReservedSlot)).toBeNull();
    expect(queryByTestId(READING_TEST_IDS.adBannerContent)).toBeTruthy();
  });

  it.each<ThemeId>(['light', 'cream', 'dark'])(
    'Test 7 — themed reserved slot when SDK not ready (theme=%s)',
    async (themeId) => {
      (initializeAdMob as jest.Mock).mockImplementation(() => new Promise(() => {}));

      const { getByTestId, queryByTestId } = render(
        <TestSafeAreaProvider>
          <AdBanner themeId={themeId} testID={READING_TEST_IDS.adBanner} />
        </TestSafeAreaProvider>
      );

      await waitFor(() => {
        expect(getByTestId(READING_TEST_IDS.adBannerReservedSlot)).toBeTruthy();
      });

      expect(queryByTestId('mock-google-banner-ad')).toBeNull();
      const bg = readBackground(getByTestId, READING_TEST_IDS.adBannerReservedSlot);
      expect(bg).toBe(getTheme(themeId).adSlotBackground);
      expect(bg).not.toBe('#000000');
    }
  );

  it('Test 8 — keeps banner mounted while retrying failed loads (cream)', async () => {
    const React = require('react');
    const ReactNativeAds = require('react-native-google-mobile-ads');
    const originalBanner = ReactNativeAds.BannerAd;
    ReactNativeAds.BannerAd = (props: { onAdFailedToLoad?: (e: { message: string }) => void }) => {
      React.useEffect(() => {
        props.onAdFailedToLoad?.({ message: 'network' });
      }, [props.onAdFailedToLoad]);
      return React.createElement(require('react-native').View, {
        testID: 'mock-google-banner-ad',
      });
    };

    const { queryByTestId } = render(
      <TestSafeAreaProvider>
        <AdBanner themeId="cream" testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(queryByTestId('mock-google-banner-ad')).toBeTruthy();
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AdBanner] failed error=network')
    );

    ReactNativeAds.BannerAd = originalBanner;
  });

  it('Test 9 — busy does not change reserved height', async () => {
    const expectedHeight = getResolvedBannerReservedHeight({ includeBlend: false });

    const { getByTestId, rerender } = render(
      <TestSafeAreaProvider>
        <AdBanner interactionSafeForAds testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByTestId('mock-google-banner-ad')).toBeTruthy();
    });

    const readHeight = () => readReservedHeight(getByTestId, READING_TEST_IDS.adBanner);
    expect(readHeight()).toBe(expectedHeight);

    rerender(
      <TestSafeAreaProvider>
        <AdBanner interactionSafeForAds={false} testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    expect(readHeight()).toBe(expectedHeight);
  });

  it('Test 10 — anchored adaptive height source of truth', () => {
    expect(AD_BANNER_TYPE).toBe('anchoredAdaptive');
    expect(getResolvedBannerReservedHeight()).toBe(AD_BANNER_SLOT_HEIGHT);
    expect(getResolvedBannerReservedHeight()).toBe(getAdBannerReservedHeight());
  });

  it('Test 14 — banner stays mounted on repeated busy toggles', async () => {
    let mountCount = 0;
    const ReactNativeAds = require('react-native-google-mobile-ads');
    const originalBanner = ReactNativeAds.BannerAd;
    ReactNativeAds.BannerAd = (props: { onAdLoaded?: () => void }) => {
      const React = require('react');
      const { View } = require('react-native');
      React.useEffect(() => {
        mountCount += 1;
        props.onAdLoaded?.();
      }, []);
      return React.createElement(View, { testID: 'mock-google-banner-ad' });
    };

    const { getByTestId, queryByTestId, rerender } = render(
      <TestSafeAreaProvider>
        <AdBanner interactionSafeForAds testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(getByTestId('mock-google-banner-ad')).toBeTruthy();
    });

    const mountsAfterLoad = mountCount;

    for (let i = 0; i < 50; i += 1) {
      rerender(
        <TestSafeAreaProvider>
          <AdBanner interactionSafeForAds={i % 2 === 0} testID={READING_TEST_IDS.adBanner} />
        </TestSafeAreaProvider>
      );
      expect(queryByTestId('mock-google-banner-ad')).toBeTruthy();
    }

    expect(mountCount).toBe(mountsAfterLoad);
    ReactNativeAds.BannerAd = originalBanner;
  });

  it('Test 15 — failed ad does not create tight retry loop', async () => {
    let failCalls = 0;
    const ReactNativeAds = require('react-native-google-mobile-ads');
    const originalBanner = ReactNativeAds.BannerAd;
    ReactNativeAds.BannerAd = (props: { onAdFailedToLoad?: (e: { message: string }) => void }) => {
      React.useEffect(() => {
        failCalls += 1;
        props.onAdFailedToLoad?.({ message: 'no-fill' });
      }, [props.onAdFailedToLoad]);
      return React.createElement(require('react-native').View, {
        testID: 'mock-google-banner-ad',
      });
    };

    render(
      <TestSafeAreaProvider>
        <AdBanner themeId="light" testID={READING_TEST_IDS.adBanner} />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(failCalls).toBeGreaterThanOrEqual(1);
    });

    expect(failCalls).toBeLessThanOrEqual(4);
    ReactNativeAds.BannerAd = originalBanner;
  });

  it('Test 16 — BannerAd is not wrapped by Pressable or touch-blocking overlay', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '../src/components/AdBanner.tsx'),
      'utf8'
    );
    expect(source).not.toMatch(/TouchableOpacity|Pressable/);
    expect(source).not.toMatch(/StyleSheet\.absoluteFill/);
    expect(source).not.toMatch(/pointerEvents="none"\s*\/>\s*\n\s*<\/View>\s*\)\s*:\s*\(/);
  });

  it('logs [AdBanner] diagnostics and ad unit mode', async () => {
    render(
      <TestSafeAreaProvider>
        <AdBanner
          interactionSafeForAds={false}
          themeId="dark"
          safeDistanceFromControls={AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS}
          testID={READING_TEST_IDS.adBanner}
        />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith('[AdBanner] adUnitMode=test');
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AdBanner] render adsAllowed=true')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AdBanner] bannerType=anchoredAdaptive')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AdBanner] reservedHeight=')
    );
    expect(getBannerAdUnitId()).not.toBe(PRODUCTION_BANNER_AD_UNIT_ID);
    expect(getBannerAdUnitMode()).toBe('test');
  });

  it('includes blend height when backgroundColor is provided', async () => {
    const plainScreen = render(
      <TestSafeAreaProvider>
        <AdBanner testID="plain-ad-banner" />
      </TestSafeAreaProvider>
    );
    const blendedScreen = render(
      <TestSafeAreaProvider>
        <AdBanner testID="blended-ad-banner" backgroundColor="#101820" />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(plainScreen.getByTestId('plain-ad-banner')).toBeTruthy();
    });

    const plain = readReservedHeight(plainScreen.getByTestId, 'plain-ad-banner');
    const blended = readReservedHeight(blendedScreen.getByTestId, 'blended-ad-banner');

    expect(blended).toBe(getResolvedBannerReservedHeight({ includeBlend: true }));
    expect(blended).toBeGreaterThan(plain);
  });
});

describe('AdBanner slot height', () => {
  it('uses stable banner slot height constant', () => {
    expect(AD_BANNER_SLOT_HEIGHT).toBeGreaterThanOrEqual(50);
    expect(getAdBannerReservedHeight()).toBe(AD_BANNER_SLOT_HEIGHT);
  });
});
