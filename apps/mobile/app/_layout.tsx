import { useFonts, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Never block startup indefinitely if font loading stalls.
  useEffect(() => {
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(timeout);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <>
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
    </>
  );
}
