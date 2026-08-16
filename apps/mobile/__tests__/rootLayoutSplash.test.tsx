import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import RootLayout from '../app/_layout';
import { SPLASH_READY_TIMEOUT_MS } from '../src/splash/splashLayout';

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@expo-google-fonts/playfair-display', () => ({
  useFonts: jest.fn(),
  PlayfairDisplay_600SemiBold: 'PlayfairDisplay_600SemiBold',
}));

jest.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 'Inter_400Regular',
  Inter_600SemiBold: 'Inter_600SemiBold',
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const Stack = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  Stack.Screen = () => null;
  return { Stack };
});

jest.mock('../src/update/AppUpdatePromptHost', () => ({
  AppUpdatePromptHost: () => null,
}));

jest.mock('../src/boot/InitialRouteGate', () => ({
  InitialRouteGate: () => null,
}));

jest.mock('../src/onboarding/onboardingStorage', () => ({
  isOnboardingComplete: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/config/adMob', () => ({
  areAdsEnabled: jest.fn(() => false),
}));

const { useFonts } = jest.requireMock('@expo-google-fonts/playfair-display') as {
  useFonts: jest.Mock;
};

function mockFonts(state: { loaded: boolean; error: Error | null }) {
  useFonts.mockReturnValue([state.loaded, state.error]);
}

describe('RootLayout splash lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFonts({ loaded: false, error: null });
  });

  it('hides splash after fonts load', async () => {
    const view = render(<RootLayout />);
    expect(view.toJSON()).toBeNull();

    mockFonts({ loaded: true, error: null });
    await act(async () => {
      view.rerender(<RootLayout />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('hides splash when font loading fails instead of hanging', async () => {
    const view = render(<RootLayout />);

    mockFonts({ loaded: false, error: new Error('font failed') });
    await act(async () => {
      view.rerender(<RootLayout />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('safety timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it(`falls back after ${SPLASH_READY_TIMEOUT_MS}ms if fonts never resolve`, async () => {
      render(<RootLayout />);

      await act(async () => {
        jest.advanceTimersByTime(SPLASH_READY_TIMEOUT_MS);
      });

      await waitFor(() => {
        expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
      });
    });
  });
});
