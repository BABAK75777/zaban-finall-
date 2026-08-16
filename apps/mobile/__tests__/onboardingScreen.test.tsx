import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import OnboardingScreen, { ONBOARDING_TEST_IDS } from '../app/onboarding';
import { ONBOARDING_URL } from '../src/onboarding/constants';
import {
  __resetOnboardingStorageForTests,
  isOnboardingComplete,
} from '../src/onboarding/onboardingStorage';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ mode: undefined }),
}));

describe('OnboardingScreen', () => {
  beforeEach(async () => {
    mockReplace.mockReset();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await __resetOnboardingStorageForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows onboarding content on first launch', () => {
    const screen = render(<OnboardingScreen />);
    expect(screen.getByTestId(ONBOARDING_TEST_IDS.content)).toBeTruthy();
    expect(screen.getByTestId(ONBOARDING_TEST_IDS.fallback)).toBeTruthy();
  });

  it('uses the Mamlio how-to URL with app source tag', () => {
    expect(ONBOARDING_URL).toBe('https://www.mamlio.com/how-to-use?source=app');
  });

  it('completes onboarding and returns to app with AI queued', async () => {
    const screen = render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId(ONBOARDING_TEST_IDS.startButton));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
    expect(await isOnboardingComplete()).toBe(true);
  });

  it('can open the website guide without blocking return to app', async () => {
    const screen = render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId(ONBOARDING_TEST_IDS.openWebsite));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(ONBOARDING_URL);
    });
    expect(screen.getByTestId(ONBOARDING_TEST_IDS.startButton)).toBeTruthy();
  });
});
