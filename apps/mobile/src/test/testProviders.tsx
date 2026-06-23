import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 414, height: 896 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function TestSafeAreaProvider({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>{children}</SafeAreaProvider>
  );
}
