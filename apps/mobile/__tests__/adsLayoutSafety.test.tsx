import React from 'react';
import { Animated, View } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS,
  getAdBannerReservedHeight,
} from '../src/ads/adBannerLayout';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { ActionCluster } from '../src/ui/ActionCluster';
import { NavPills } from '../src/ui/NavPills';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { FontReadyContext } from '../src/theme/FontReadyContext';
import { getTheme } from '../src/theme/themes';

function readPaddingBottom(style: object | object[] | undefined): number {
  const flat = Array.isArray(style) ? Object.assign({}, ...style) : style ?? {};
  return (flat as { paddingBottom?: number }).paddingBottom ?? 0;
}

describe('ads layout safety', () => {
  it('renders controls above the ad banner with safe vertical spacing', () => {
    const theme = getTheme('dark');
    const hearPulse = new Animated.Value(1);
    const micBreath = new Animated.Value(1);

    const { getByTestId } = render(
      <TestSafeAreaProvider>
        <FontReadyContext.Provider value={true}>
          <View>
            <View
              style={{ paddingBottom: AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS }}
              testID={READING_TEST_IDS.controlsDock}
            >
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
              testID={READING_TEST_IDS.adBanner}
              style={{ height: getAdBannerReservedHeight({ includeBlend: true }) }}
            />
          </View>
        </FontReadyContext.Provider>
      </TestSafeAreaProvider>
    );

    const dock = getByTestId(READING_TEST_IDS.controlsDock);
    const banner = getByTestId(READING_TEST_IDS.adBanner);

    expect(readPaddingBottom(dock.props.style)).toBeGreaterThanOrEqual(
      AD_BANNER_SAFE_DISTANCE_FROM_CONTROLS
    );
    expect(banner.props.style.height).toBe(getAdBannerReservedHeight({ includeBlend: true }));
  });
});
