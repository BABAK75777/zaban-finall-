import React from 'react';
import { Animated, Dimensions, View } from 'react-native';
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

function renderFooterLayout(width: number, fontScale: number) {
  Dimensions.set({
    window: { width, height: 640, scale: 2, fontScale },
    screen: { width, height: 640, scale: 2, fontScale },
  });

  const theme = getTheme('dark');
  const hearPulse = new Animated.Value(1);
  const micBreath = new Animated.Value(1);

  return render(
    <TestSafeAreaProvider>
      <FontReadyContext.Provider value={true}>
        <View style={{ width, flex: 1 }}>
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
          <AdBanner themeId="dark" backgroundColor={theme.bg} testID={READING_TEST_IDS.adBanner} />
        </View>
      </FontReadyContext.Provider>
    </TestSafeAreaProvider>
  );
}

describe('ReadingScreenAdLayout', () => {
  it.each([
    { width: 320, height: 568, fontScale: 1.2 },
    { width: 360, height: 640, fontScale: 1.4 },
  ])('Test 7 — small phone layout width=$width fontScale=$fontScale', ({ width, fontScale }) => {
    const screen = renderFooterLayout(width, fontScale);
    expect(screen.getByTestId(READING_TEST_IDS.adBanner)).toBeTruthy();
    expect(screen.getByTestId(READING_TEST_IDS.adSafeGap)).toBeTruthy();
    expect(screen.getByTestId(READING_TEST_IDS.back)).toBeTruthy();
    expect(screen.getByTestId(READING_TEST_IDS.shadow)).toBeTruthy();
    const bannerStyle = screen.getByTestId(READING_TEST_IDS.adBanner).props.style;
    const flat = Array.isArray(bannerStyle) ? Object.assign({}, ...bannerStyle) : bannerStyle;
    const height = flat.minHeight ?? flat.height;
    expect(height).toBe(getAdBannerReservedHeight({ includeBlend: true }));
  });
});
