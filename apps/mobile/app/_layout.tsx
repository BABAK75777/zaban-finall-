import '../src/polyfills/urlPolyfill';

import { useFonts, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { Component, type ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { resolveAppBoot } from '../src/boot/appBoot';
import { InitialRouteGate } from '../src/boot/InitialRouteGate';
import { FontReadyContext } from '../src/theme/FontReadyContext';
import { areAdsEnabled } from '../src/config/adMob';
import { refreshAdsConsent } from '../src/ads/adsConsent';
import { initializeAdMob } from '../src/ads/initializeAdMob';
import { AppUpdatePromptHost } from '../src/update/AppUpdatePromptHost';
import { SPLASH_READY_TIMEOUT_MS } from '../src/splash/splashLayout';

const greatVibesFont = require('../assets/fonts/GreatVibes-Regular.ttf');

void SplashScreen.preventAutoHideAsync().catch(() => {});

type ErrorBoundaryState = { error: Error | null };

class RootErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={bootStyles.errorWrap}>
          <Text style={bootStyles.errorTitle}>App failed to start</Text>
          <Text style={bootStyles.errorBody}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const [bootReady, setBootReady] = useState(false);
  const bootStartedAtRef = useRef(Date.now());
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    GreatVibes_400Regular: greatVibesFont,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    let cancelled = false;
    const startedAt = bootStartedAtRef.current;

    const evaluate = async () => {
      const elapsedMs = Date.now() - startedAt;
      const result = await resolveAppBoot({
        fontsLoaded,
        fontError,
        elapsedMs,
      });
      if (!cancelled && result.ready) {
        setBootReady(true);
      }
    };

    void evaluate();

    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        if (__DEV__) {
          console.log('[Boot] splash safety timeout reached');
        }
        setBootReady(true);
      }
    }, SPLASH_READY_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (bootReady) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [bootReady]);

  useEffect(() => {
    if (!areAdsEnabled()) {
      return;
    }
    void refreshAdsConsent().then((snapshot) => {
      if (snapshot.consentAllowsAds) {
        void initializeAdMob();
      }
    });
  }, []);

  if (!bootReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
        <FontReadyContext.Provider value={fontsLoaded}>
          <StatusBar style="auto" />
          <InitialRouteGate bootReady={bootReady} />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#FFFFFF',
              },
              headerTintColor: '#141820',
              headerTitleStyle: {
                fontFamily: fontsLoaded ? 'Inter_600SemiBold' : undefined,
                fontWeight: '600',
              },
              contentStyle: { backgroundColor: '#FFFFFF' },
            }}
          >
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ title: 'Reading', headerShown: false }} />
            <Stack.Screen name="library" options={{ title: 'Library' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
          <AppUpdatePromptHost />
        </FontReadyContext.Provider>
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}

const bootStyles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    backgroundColor: '#050A30',
    padding: 24,
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.72)',
    lineHeight: 20,
  },
});
