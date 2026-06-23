import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AdBanner } from '../src/components/AdBanner';
import { TestSafeAreaProvider } from '../src/test/testProviders';
import { READING_TEST_IDS } from '../src/ui/testIds';
import { initializeAdMob } from '../src/ads/initializeAdMob';
import { areAdsEnabled } from '../src/config/adMob';

jest.mock('../src/config/adMob', () => ({
  areAdsEnabled: jest.fn(() => true),
  resolveBannerAdUnitId: jest.fn(() => 'ca-app-pub-test/banner'),
}));

describe('AdBanner', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_VALIDATION_BUILD = '0';
    jest.clearAllMocks();
    (areAdsEnabled as jest.Mock).mockReturnValue(true);
    (initializeAdMob as jest.Mock).mockResolvedValue(true);
  });

  it('initializes AdMob when ads are enabled', async () => {
    render(
      <TestSafeAreaProvider>
        <AdBanner />
      </TestSafeAreaProvider>
    );

    await waitFor(() => {
      expect(initializeAdMob).toHaveBeenCalledTimes(1);
    });
  });

  it('stays hidden when ads are disabled for validation builds', () => {
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
});
