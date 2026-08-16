import React from 'react';
import { Animated, View } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
  AD_SAFE_GAP_DP,
  getAdBannerReservedHeight,
} from '../src/ads/adBannerLayout';
import { AdBanner } from '../src/components/AdBanner';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { ActionCluster } from '../src/ui/ActionCluster';
import { NavPills } from '../src/ui/NavPills';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { FontReadyContext } from '../src/theme/FontReadyContext';
import { getTheme } from '../src/theme/themes';

function readHeight(style: object | object[] | undefined): number {
  const flat = Array.isArray(style) ? Object.assign({}, ...style) : style ?? {};
  return (flat as { height?: number; minHeight?: number }).minHeight ?? (flat as { height?: number }).height ?? 0;
}

describe('AdBannerLayout', () => {
  it('Test 5 — controls separated from banner with safe gap', () => {
    const theme = getTheme('dark');
    const hearPulse = new Animated.Value(1);
    const micBreath = new Animated.Value(1);

    const { getByTestId } = render(
      <TestSafeAreaProvider>
        <FontReadyContext.Provider value={true}>
          <View>
            <View testID={READING_TEST_IDS.controlsDock}>
              <NavPills
                theme={theme}
                backDisabled={false}
                nextDisabled={false}
                hearDisabled={false}
                hearLoading={false}
                hearPulse={hearPulse}
                onBack={() => {}}
                onNext={() => {}}
                onHear={() => {}}
              />
              <ActionCluster
                theme={theme}
                micBreath={micBreath}
                shadowRecording={false}
                shadowPlaying={false}
                onMic={() => {}}
              />
            </View>
            <View
              testID={READING_TEST_IDS.adSafeGap}
              style={{ height: Math.max(AD_SAFE_GAP_DP, AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS) }}
            />
            <AdBanner themeId="dark" testID={READING_TEST_IDS.adBanner} />
          </View>
        </FontReadyContext.Provider>
      </TestSafeAreaProvider>
    );

    const gap = getByTestId(READING_TEST_IDS.adSafeGap);
    const banner = getByTestId(READING_TEST_IDS.adBanner);

    expect(readHeight(gap.props.style)).toBeGreaterThanOrEqual(AD_SAFE_GAP_DP);
    expect(readHeight(banner.props.style)).toBeGreaterThanOrEqual(
      getAdBannerReservedHeight({ includeBlend: false })
    );
    expect(getByTestId(READING_TEST_IDS.back)).toBeTruthy();
    expect(getByTestId(READING_TEST_IDS.shadow)).toBeTruthy();
  });
});
