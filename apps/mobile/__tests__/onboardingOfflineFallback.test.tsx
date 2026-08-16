import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import OnboardingScreen, { ONBOARDING_TEST_IDS } from '../app/onboarding';
import { ONBOARDING_FALLBACK_BODY } from '../src/onboarding/onboardingFallback';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useLocalSearchParams: () => ({ mode: undefined }),
}));

describe('onboarding offline fallback', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows local fallback and start button when website cannot open', () => {
    const screen = render(<OnboardingScreen />);
    expect(screen.getByText(ONBOARDING_FALLBACK_BODY)).toBeTruthy();
    expect(screen.getByTestId(ONBOARDING_TEST_IDS.startButton)).toBeTruthy();
  });

  it('keeps start button available after failed website open', async () => {
    const screen = render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId(ONBOARDING_TEST_IDS.openWebsite));
    expect(screen.getByTestId(ONBOARDING_TEST_IDS.startButton)).toBeTruthy();
  });
});
