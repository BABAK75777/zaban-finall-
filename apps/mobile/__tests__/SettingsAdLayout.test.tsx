import React from 'react';
import { Dimensions } from 'react-native';
import { render } from '@testing-library/react-native';
import SettingsScreen from '../app/settings';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { AD_SAFE_GAP_DP } from '../src/ads/adBannerLayout';

jest.mock('../src/theme/useTheme', () => {
  const { getTheme } = require('../src/theme/themes');
  return {
    useTheme: () => ({
      themeId: 'cream',
      theme: getTheme('cream'),
      ready: true,
      setTheme: jest.fn(),
      cycleTheme: jest.fn(),
      resetTheme: jest.fn(),
    }),
  };
});

function readHeight(style: object | object[] | undefined): number {
  const flat = Array.isArray(style) ? Object.assign({}, ...style) : style ?? {};
  return (flat as { height?: number }).height ?? 0;
}

describe('SettingsAdLayout', () => {
  it('Test 6 — settings scrolls with stable ad footer and safe gap', () => {
    Dimensions.set({
      window: { width: 320, height: 568, scale: 2, fontScale: 1.2 },
      screen: { width: 320, height: 568, scale: 2, fontScale: 1.2 },
    });

    const { getByTestId } = render(
      <TestSafeAreaProvider>
        <SettingsScreen />
      </TestSafeAreaProvider>
    );

    expect(getByTestId('settings-scroll')).toBeTruthy();
    expect(getByTestId(READING_TEST_IDS.adSafeGap)).toBeTruthy();
    expect(getByTestId(READING_TEST_IDS.adBanner)).toBeTruthy();
    expect(readHeight(getByTestId(READING_TEST_IDS.adSafeGap).props.style)).toBeGreaterThanOrEqual(
      AD_SAFE_GAP_DP
    );
  });
});
