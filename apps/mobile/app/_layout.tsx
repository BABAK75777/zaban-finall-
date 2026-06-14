import '../src/polyfills/urlPolyfill';
import { useFonts, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { FontReadyContext } from '../src/theme/FontReadyContext';

const greatVibesFont = require('../assets/fonts/GreatVibes-Regular.ttf');

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [bootReady, setBootReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    GreatVibes_400Regular: greatVibesFont,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const ready = fontsLoaded || !!fontError || bootReady;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Never block startup indefinitely if font loading stalls.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setBootReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <FontReadyContext.Provider value={fontsLoaded}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#F8F7FC',
          },
          headerTintColor: '#17151F',
          headerTitleStyle: {
            fontFamily: fontsLoaded ? 'Inter_600SemiBold' : undefined,
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Reading', headerShown: false }} />
        <Stack.Screen name="library" options={{ title: 'Library' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </FontReadyContext.Provider>
  );
}
