import '../src/polyfills/urlPolyfill';
import { useFonts, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { Component, type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FontReadyContext } from '../src/theme/FontReadyContext';
import { areAdsEnabled } from '../src/config/adMob';
import { initializeAdMob } from '../src/ads/initializeAdMob';

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
  const [showBoot, setShowBoot] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    GreatVibes_400Regular: greatVibesFont,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowBoot(false);
      SplashScreen.hideAsync().catch(() => {});
    }, 800);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setShowBoot(false);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!areAdsEnabled()) {
      return;
    }
    void initializeAdMob();
  }, []);

  return (
    <RootErrorBoundary>
      <FontReadyContext.Provider value={fontsLoaded}>
        <StatusBar style="auto" />
        {showBoot ? (
          <View style={bootStyles.boot}>
            <ActivityIndicator size="large" color="#8F7FD4" />
          </View>
        ) : null}
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
          <Stack.Screen name="index" options={{ title: 'Reading', headerShown: false }} />
          <Stack.Screen name="library" options={{ title: 'Library' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </FontReadyContext.Provider>
    </RootErrorBoundary>
  );
}

const bootStyles = StyleSheet.create({
  boot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 20,
  },
  errorWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#141820',
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 14,
    color: '#5C6478',
    lineHeight: 20,
  },
});
